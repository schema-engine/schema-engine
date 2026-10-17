import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { useFormContext, useController } from 'react-hook-form';
import * as z from 'zod/mini';
import { createFormEngine, type BuilderActionRuntimeContext, type FormConfigView } from '@schema-engine/forms';
import { FormProvider } from '../../src/adapters/rhf/form-provider';
import { FormEngineContext } from '../../src/components/provider';
import { FormAdapterContext } from '../../src/adapters/context';
import { rhfAdapter } from '../../src/adapters/react-hook-form';
import { useFormInstanceActions } from '../../src/hooks/use-form-context';
import { useControlledFormElement } from '../../src/hooks/use-field';
import type { ElementConfig, FormActionConfig } from '@schema-engine/forms/schemas';

const handled: string[] = [];
const contexts: BuilderActionRuntimeContext[] = [];
const validationResults: boolean[] = [];
const engine = createFormEngine({
	actions: [
		{
			$type: 'probe',
			schema: z.object({ $type: z.literal('probe'), id: z.string() }),
			metadata: { name: 'Probe', category: 'test' },
			execute: async (context: BuilderActionRuntimeContext) => {
				handled.push((context.config as { id: string }).id);
				if ((context.config as { id: string }).id === 'mounted')
					validationResults.push(await context.form.validate());
				contexts.push(context);
				if ((context.config as { id: string }).id === 'abort')
					return { success: false, shouldContinue: false, error: 'Rejected' };
				return { success: true, data: { id: (context.config as { id: string }).id } };
			},
		},
	],
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	handled.length = 0;
	contexts.length = 0;
	validationResults.length = 0;
});

const street: ElementConfig = {
	$type: 'input',
	name: 'address.street',
	id: 'street',
	rules: [{ type: 'minLength', value: 3, message: 'Street is too short' }],
};
const config: FormConfigView = {
	id: 'adoption',
	reValidateMode: 'onChange',
	steps: [
		{
			id: 'one',
			title: 'One',
			elements: [
				{
					$type: 'fieldset',
					name: 'address',
					elements: [
						{
							...street,
							name: 'street',
							rules: [{ type: 'required', message: 'Street is required' }, ...street.rules!],
						},
					],
				},
			],
		},
		{ id: 'two', title: 'Two', elements: [] },
	],
};

function Field({ name }: { name: string }) {
	const { field, fieldState } = useController({ name });
	return (
		<label>
			{name}
			<input {...field} value={field.value ?? ''} />
			<span role="alert">{fieldState.error?.message ?? ''}</span>
		</label>
	);
}
function Controls({ action }: { action?: FormActionConfig }) {
	const { currentStep, goToNext, executeAction, submissionState } = useFormInstanceActions();
	const form = useFormContext();
	const [actionResult, setActionResult] = useState<unknown>();
	return (
		<>
			<output aria-label="step">{currentStep}</output>
			<output aria-label="submission">{submissionState.status}</output>
			<output aria-label="submission errors">
				{submissionState.errors.map(({ actionId, message }) => `${actionId}: ${message}`).join(', ')}
			</output>
			<output aria-label="action result">{JSON.stringify(actionResult)}</output>
			<button type="button" onClick={goToNext}>
				Next
			</button>
			<button type="submit">Submit</button>
			{action && (
				<button type="button" onClick={() => void executeAction(action).then(setActionResult)}>
					Execute
				</button>
			)}
			<button type="button" onClick={() => void form.trigger()}>
				Validate
			</button>
		</>
	);
}
function mount(
	formConfig: FormConfigView,
	children: React.ReactNode,
	onAction?: (action: FormActionConfig, data: Record<string, unknown>) => void,
) {
	return render(
		<FormEngineContext.Provider value={{ engine }}>
			<FormAdapterContext.Provider value={rhfAdapter}>
				<FormProvider
					config={formConfig}
					defaultValues={{ address: { street: '' }, customerType: 'company', vatNumber: '' }}
					onAction={onAction}
				>
					{children}
				</FormProvider>
			</FormAdapterContext.Provider>
		</FormEngineContext.Provider>,
	);
}

test('Next validates fields inside a fieldset', async () => {
	mount(
		config,
		<>
			<Field name="address.street" />
			<Controls />
		</>,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Next' }));
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Street is required'));
	expect(screen.getByLabelText('step')).toHaveTextContent('0');
	await userEvent.fill(screen.getByRole('textbox'), 'abc');
	await userEvent.tab();
	await userEvent.keyboard('{Enter}');
	await waitFor(() => expect(screen.getByLabelText('step')).toHaveTextContent('1'));
});

test('a nested error clears when the value becomes valid', async () => {
	mount(
		config,
		<>
			<Field name="address.street" />
			<Controls />
		</>,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Street is required'));
	await userEvent.fill(screen.getByRole('textbox'), 'abc');
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/^$/));
});

const vat: ElementConfig = {
	$type: 'input',
	name: 'vatNumber',
	id: 'vat',
	constraints: [{ action: 'require', field: 'customerType', operator: 'equals', value: 'company' }],
};
function Vat() {
	const { fieldProps, value, onChange, error } = useControlledFormElement(vat);
	return (
		<>
			<input
				{...fieldProps}
				aria-label="VAT"
				value={String(value ?? '')}
				onChange={(event) => onChange(event.target.value)}
			/>
			<span aria-label="VAT error" role="alert">
				{error}
			</span>
		</>
	);
}
test('a require constraint makes the field required', async () => {
	mount(
		{ ...config, steps: [{ id: 'one', title: 'One', elements: [vat] }] },
		<>
			<Vat />
			<Field name="customerType" />
			<Controls />
		</>,
	);
	expect(screen.getByRole('textbox', { name: 'VAT' })).toBeRequired();
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	await waitFor(() => expect(screen.getByLabelText('VAT error').textContent).not.toBe(''));
	await userEvent.fill(screen.getByRole('textbox', { name: 'customerType' }), 'individual');
	await waitFor(() => expect(screen.getByLabelText('VAT error')).toHaveTextContent(/^$/));
	expect(screen.getByRole('textbox', { name: 'VAT' })).not.toBeRequired();
});

test('executeAction runs only the given action and reports its result', async () => {
	const actions: FormActionConfig[] = ['save-draft', 'publish'].map((id) => ({
		$type: 'probe',
		id,
		triggers: ['form_submit'],
	}));
	const callback = vi.fn();
	mount({ ...config, actions }, <Controls action={actions[1]} />, callback);
	await userEvent.click(screen.getByRole('button', { name: 'Execute' }));
	await waitFor(() => expect(screen.getByLabelText('submission')).toHaveTextContent('success'));
	expect(handled).toEqual(['publish']);
	expect(JSON.parse(screen.getByLabelText('action result').textContent!)).toEqual({
		success: true,
		data: { id: 'publish' },
	});
	expect(callback).toHaveBeenCalledWith(actions[1], expect.any(Object));
});

test('step triggers carry the elapsed form time and destination step', async () => {
	const now = Date.now();
	const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
	mount(
		{
			...config,
			steps: [
				{ id: 'one', elements: [] },
				{ id: 'two', elements: [] },
			],
			actions: [{ $type: 'probe', id: 'step', triggers: ['step_change'] }],
		},
		<Controls />,
	);
	clock.mockReturnValue(now + 2000);
	await userEvent.click(screen.getByRole('button', { name: 'Next' }));
	await waitFor(() => expect(contexts).toHaveLength(1));
	expect(contexts[0]).toMatchObject({ currentStep: 1, metadata: { totalFormTime: 2000 } });
});

test('the action context form adapter validates', async () => {
	mount(
		{ ...config, actions: [{ $type: 'probe', id: 'mounted', triggers: ['form_mount'] }] },
		<Field name="address.street" />,
	);
	await waitFor(() => expect(contexts).toHaveLength(1));
	expect(validationResults).toEqual([false]);
	contexts[0]!.form.setValue('address.street', 'abc');
	expect(contexts[0]!.form.getValue('address.street')).toBe('abc');
	expect(await contexts[0]!.form.validate()).toBe(true);
});

test('submission validates once before invoking the submit callback', async () => {
	const fetch = vi
		.spyOn(globalThis, 'fetch')
		.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 200 }));
	const submitted = vi.fn();
	render(
		<FormEngineContext.Provider value={{ engine }}>
			<FormProvider
				config={{
					...config,
					steps: [
						{
							id: 'one',
							title: 'One',
							elements: [
								{
									$type: 'input',
									name: 'email',
									rules: [{ type: 'async', url: '/validate', debounce: 0, disableCache: true }],
								},
							],
						},
					],
				}}
				defaultValues={{ email: 'a@example.com' }}
				onSubmit={submitted}
			>
				<Field name="email" />
				<button type="submit">Submit once</button>
			</FormProvider>
		</FormEngineContext.Provider>,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Submit once' }));
	await waitFor(() => expect(submitted).toHaveBeenCalledWith({ email: 'a@example.com' }));
	expect(fetch).toHaveBeenCalledTimes(1);
});

test('submission errors name the failing action', async () => {
	mount(
		{
			id: 'failing-actions',
			steps: [{ id: 'one', title: 'One', elements: [] }],
			actions: [
				{ $type: 'probe', id: 'first', triggers: ['form_submit'] },
				{ $type: 'probe', id: 'mounted-only', triggers: ['form_mount'] },
				{ $type: 'probe', id: 'abort', triggers: ['form_submit'] },
			],
		},
		<Controls />,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	await waitFor(() => expect(screen.getByLabelText('submission')).toHaveTextContent('error'));
	expect(screen.getByLabelText('submission errors')).toHaveTextContent('abort: Rejected');
});
