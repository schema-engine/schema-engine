import { fieldText } from '@/hooks/field-text';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import * as z from 'zod/mini';
import {
	createFormEngine,
	type BuilderActionRuntimeContext,
	type ElementConfig,
	type FormActionConfig,
	type FormConfig,
} from '@schema-engine/forms';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { FormProvider } from '../../src/components/form-provider';
import { FormRenderer } from '../../src/components/internals/form-renderer';
import { FormEngineContext } from '../../src/components/provider';
import { useFormContext, useFormField } from '../../src/hooks/form-state';
import { useFormInstanceActions } from '../../src/hooks/use-form-context';

const handled: string[] = [];
const contexts: BuilderActionRuntimeContext[] = [];
const validationResults: string[] = [];
const engine = createFormEngine({
	elements: [InputElementRegistration, FieldSetRegistration],
	actions: [
		{
			$type: 'probe',
			schema: z.object({}),
			metadata: { name: 'Probe', category: 'test' },
			execute: async (context: BuilderActionRuntimeContext) => {
				handled.push((context.config as { id: string }).id);
				if ((context.config as { id: string }).id === 'mounted')
					validationResults.push((await context.form.validate()).outcome);
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
	rules: [{ $type: 'minLength', value: 3, message: 'Street is too short' }],
};
const config: FormConfig = {
	id: 'adoption',
	reValidateMode: 'onChange',
	steps: [
		{
			id: 'one',
			title: 'One',
			elements: [
				{
					$type: 'fieldSet',
					name: 'address',
					elements: [
						{
							...street,
							name: 'street',
							rules: [{ $type: 'required', message: 'Street is required' }, ...street.rules!],
						},
					],
				},
			],
		},
		{ id: 'two', title: 'Two', elements: [] },
	],
};

function Field({ name }: { name: string }) {
	const { defaultValue, error, fieldProps } = useFormField({ $type: 'input', name, id: name });
	return (
		<label>
			{name}
			<input {...fieldProps} defaultValue={fieldText(defaultValue)} />
			<span role="alert">{error ?? ''}</span>
		</label>
	);
}
function Controls() {
	const { steps, current, next } = useFormInstanceActions();
	const currentStep = steps.filter(({ skipped }) => !skipped).findIndex(({ id }) => id === current);
	const { validate, formState } = useFormContext();
	const { status, failures } = formState.submission;
	return (
		<>
			<output aria-label="step">{currentStep}</output>
			<output aria-label="submission">{status}</output>
			<output aria-label="submission errors">
				{failures
					.map((failure) =>
						typeof failure.params?.actionId === 'string' && failure.message
							? `${failure.params.actionId}: ${failure.message}`
							: failure.type,
					)
					.join(', ')}
			</output>
			<button type="button" onClick={() => void next()}>
				Next
			</button>
			<button type="submit">Submit</button>
			<button type="button" onClick={() => void validate()}>
				Validate
			</button>
		</>
	);
}
function mount(
	formConfig: FormConfig,
	children: React.ReactNode,
	onAction?: (action: FormActionConfig, data: Record<string, unknown>) => void,
	onSubmit?: (data: Record<string, unknown>) => void,
	defaultValues: Record<string, unknown> = { address: { street: '' }, customerType: 'company', vatNumber: '' },
) {
	return render(
		<FormEngineContext.Provider value={{ engine }}>
			<FormProvider
				config={engine.validateForm(formConfig)}
				defaultValues={defaultValues}
				onAction={onAction}
				onSubmit={onSubmit}
			>
				{children}
			</FormProvider>
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
	constraints: [{ $type: 'require', field: 'customerType', operator: 'equals', value: 'company' }],
};
function Vat() {
	const { fieldProps, defaultValue, error } = useFormField(vat);
	return (
		<>
			<input {...fieldProps} aria-label="VAT" defaultValue={fieldText(defaultValue)} />
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
	await waitFor(() => expect(screen.getByRole('textbox', { name: 'VAT' })).toHaveAttribute('aria-invalid', 'true'));
	expect(screen.getByLabelText('VAT error')).toHaveTextContent(/^$/);
	await userEvent.fill(screen.getByRole('textbox', { name: 'customerType' }), 'individual');
	await waitFor(() => expect(screen.getByRole('textbox', { name: 'VAT' })).toHaveAttribute('aria-invalid', 'false'));
	expect(screen.getByRole('textbox', { name: 'VAT' })).not.toBeRequired();
});

test('step triggers carry the elapsed form time and destination step', async () => {
	const now = Date.now();
	const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
	mount(
		{
			...config,
			steps: [
				{ id: 'one', title: 'One', elements: [] },
				{ id: 'two', title: 'Two', elements: [] },
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
	expect(validationResults).toEqual(['invalid']);
	contexts[0]!.form.setValue('address.street', 'abc');
	expect(contexts[0]!.form.getValue('address.street')).toBe('abc');
	expect(await contexts[0]!.form.validate()).toEqual({ outcome: 'passed' });
});

test('submission validates once before invoking the submit callback', async () => {
	const fetch = vi
		.spyOn(globalThis, 'fetch')
		.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 200 }));
	const submitted = vi.fn();
	render(
		<FormEngineContext.Provider value={{ engine }}>
			<FormProvider
				config={engine.validateForm({
					...config,
					steps: [
						{
							id: 'one',
							title: 'One',
							elements: [
								{
									$type: 'input',
									name: 'email',
									rules: [{ $type: 'async', url: '/validate', debounce: 0, disableCache: true }],
								},
							],
						},
					],
				})}
				defaultValues={{ email: 'a@example.com' }}
				onSubmit={submitted}
			>
				<Field name="email" />
				<button type="submit">Submit once</button>
			</FormProvider>
		</FormEngineContext.Provider>,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Submit once' }));
	await waitFor(() =>
		expect(submitted).toHaveBeenCalledWith(
			{ email: 'a@example.com' },
			{ setServerErrors: expect.any(Function), fetch: expect.any(Function) },
		),
	);
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

test('reports grouped action outcomes through the React renderer', async () => {
	const results = vi.fn();
	const formConfig: FormConfig = {
		id: 'parallel',
		steps: [{ id: 'one', title: 'One', elements: [] }],
		actions: [
			[
				{ id: 'ok', $type: 'probe', triggers: ['form_submit'] },
				{ id: 'abort', $type: 'probe', triggers: ['form_submit'] },
			],
			{ id: 'mounted', $type: 'probe', triggers: ['form_mount'] },
		],
	};
	render(
		<FormRenderer config={formConfig} engine={engine} onActionResults={results}>
			<Controls />
		</FormRenderer>,
	);
	await waitFor(() =>
		expect(results).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ actionId: 'mounted' })]),
			'form_mount',
		),
	);
	results.mockClear();
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
	await waitFor(() =>
		expect(results).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ actionId: 'ok', success: true, data: { id: 'ok' } }),
				expect.objectContaining({ actionId: 'abort', success: false, error: 'Rejected' }),
			]),
			'form_submit',
		),
	);
});

test('every context of a submission carries the submitted values: without excluded fields, with the payload', async () => {
	const onAction = vi.fn();
	const submitted = vi.fn();
	mount(
		{
			id: 'submitted-values',
			payload: { campaign: 'spring' },
			steps: [
				{
					id: 'one',
					title: 'One',
					elements: [
						{ $type: 'input', name: 'a' },
						{ $type: 'input', name: 'b', disabled: true },
					],
				},
			],
			actions: [{ $type: 'probe', id: 'saved', triggers: ['form_submit'] }],
		},
		<Controls />,
		onAction,
		submitted,
		{ a: 'x', b: 'hidden' },
	);
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	await waitFor(() => expect(submitted).toHaveBeenCalled());
	const expected = { a: 'x', campaign: 'spring' };
	expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'saved' }), expected);
	expect(submitted).toHaveBeenCalledWith(expected, {
		setServerErrors: expect.any(Function),
		fetch: expect.any(Function),
	});
	expect(contexts.find((context) => context.trigger === 'form_submit')?.formData).toEqual(expected);
});

test('onSubmit is handed the fetch of the engine', async () => {
	const submitted = vi.fn();
	mount(
		{ ...config, steps: config.steps.slice(0, 1) },
		<>
			<Field name="address.street" />
			<Controls />
		</>,
		undefined,
		submitted,
		{ address: { street: 'Main Street' }, customerType: 'person', vatNumber: '' },
	);
	await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

	await waitFor(() => expect(submitted).toHaveBeenCalled());
	expect(submitted.mock.calls[0]?.[1].fetch).toBe(engine.fetch);
});
