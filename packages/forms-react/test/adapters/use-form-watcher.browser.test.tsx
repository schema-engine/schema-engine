import { FormProvider as RHFFormProvider, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import type { FieldValues } from 'react-hook-form';
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@schema-engine/forms';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { WizardRecipe } from '@/components/schema-engine/forms/recipes/registrations/wizard';
import { createFormEngine } from '@/registries/builder-registry';
import { useFormWatcher } from '@/adapters/rhf/hooks/use-form-watcher';

const actionSchema = z.object({
	$type: z.literal('record-change'),
	id: z.string(),
});

const recordChange: BuilderActionRegistration<'record-change', typeof actionSchema> = {
	$type: 'record-change',
	schema: actionSchema,
	metadata: {
		name: 'Record change',
		defaultTriggers: ['form_change'],
	},
	execute: async (_context: BuilderActionExecutionContext<z.output<typeof actionSchema>>) => ({ success: true }),
};

const engine = createFormEngine({
	elements: [InputElementRegistration],
	actions: [recordChange],
	recipes: [WizardRecipe],
});

const config = engine.defineForm({
	id: 'watcher-form',
	actions: [{ $type: 'record-change', id: 'record-change' }],
	steps: [{ id: 'main', title: 'Main', elements: [] }],
});

const dispatchTrigger = vi.fn(async () => []);

function Watcher({ onChange }: { onChange?: (values: FieldValues) => void }) {
	const { control } = useFormContext<FieldValues>();

	useFormWatcher({ control, config, onChange, dispatchTrigger });

	return null;
}

function SetValueOnMount() {
	const { setValue } = useFormContext<FieldValues>();

	useEffect(() => {
		setValue('email', 'prefilled');
	}, [setValue]);

	return null;
}

function SetValueOnVersionChange({ version }: { version: number }) {
	const { setValue } = useFormContext<FieldValues>();

	useEffect(() => {
		if (version > 0) setValue('email', `draft-${version}`);
	}, [setValue, version]);

	return null;
}

function RegisterContacts() {
	useFieldArray({ name: 'contacts' });
	return null;
}

function WatcherHarness({
	onChange,
	version = 0,
	setValueOnMount = false,
}: {
	onChange?: (values: FieldValues) => void;
	version?: number;
	setValueOnMount?: boolean;
}) {
	const form = useForm<FieldValues>({ defaultValues: { email: '', contacts: [{ email: '' }] } });

	return (
		<RHFFormProvider {...form}>
			<Watcher onChange={onChange} />
			{setValueOnMount && <SetValueOnMount />}
			<SetValueOnVersionChange version={version} />
			<RegisterContacts />
			<input aria-label="Email" {...form.register('email')} />
			<button type="button" onClick={() => form.reset({ email: 'reset', contacts: [{ email: '' }] })}>
				Reset form
			</button>
			<button type="button" onClick={() => form.setValue('contacts.0.email', 'row update')}>
				Update array row
			</button>
		</RHFFormProvider>
	);
}

describe('useFormWatcher', () => {
	beforeEach(() => {
		dispatchTrigger.mockClear();
	});

	test('notifies after reset updates the full form values', async () => {
		const onChange = vi.fn();
		const view = render(<WatcherHarness onChange={onChange} />);

		await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'edited');
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ email: 'edited', contacts: [{ email: '' }] }));
		const priorCalls = onChange.mock.calls.length;

		await userEvent.click(screen.getByRole('button', { name: 'Reset form' }));

		await waitFor(() => {
			expect(onChange).toHaveBeenCalledTimes(priorCalls + 1);
			expect(onChange).toHaveBeenLastCalledWith({ email: 'reset', contacts: [{ email: '' }] });
		});
		view.unmount();
	});

	test('notifies when a child sets a value during mount', async () => {
		const onChange = vi.fn();

		render(<WatcherHarness onChange={onChange} setValueOnMount />);

		await waitFor(() => expect(onChange).toHaveBeenCalledWith({ email: 'prefilled', contacts: [{ email: '' }] }));
	});

	test('uses the latest callback when a child effect changes a value in the same commit', async () => {
		const oldOnChange = vi.fn();
		const newOnChange = vi.fn();
		const view = render(<WatcherHarness onChange={oldOnChange} />);

		view.rerender(<WatcherHarness onChange={newOnChange} version={1} />);

		await waitFor(() => expect(newOnChange).toHaveBeenCalledWith({ email: 'draft-1', contacts: [{ email: '' }] }));
		expect(oldOnChange).not.toHaveBeenCalled();
	});

	test('notifies once for a field array row update', async () => {
		const onChange = vi.fn();
		const view = render(<WatcherHarness onChange={onChange} />);

		await userEvent.click(screen.getByRole('button', { name: 'Update array row' }));

		await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
		expect(onChange).toHaveBeenCalledWith({ email: '', contacts: [{ email: 'row update' }] });
		expect(dispatchTrigger).toHaveBeenCalledTimes(1);
		view.unmount();
	});
});
