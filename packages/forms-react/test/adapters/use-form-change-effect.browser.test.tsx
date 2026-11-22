import { fieldText } from '@/hooks/field-text';
import { useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import type { BuilderActionRegistration, FormConfigView } from '@schema-engine/forms';
import { createFormEngine } from '@schema-engine/forms';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { WizardRecipe } from '@/components/schema-engine/forms/recipes/registrations/wizard';
import { useFormChangeEffect } from '@/components/form-runtime/use-form-change-effect';
import { useFormContext, useFormField, type FormValues } from '@/hooks/form-state';
import { useFormStateContext } from '@/hooks/form-state/context';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

const actionSchema = z.object({ $type: z.literal('record-change'), id: z.string() });

const recordChange: BuilderActionRegistration<'record-change', typeof actionSchema> = {
	$type: 'record-change',
	schema: actionSchema,
	metadata: { name: 'Record change', defaultTriggers: ['form_change'] },
	execute: async () => ({ success: true }),
};

const engine = createFormEngine({
	elements: [InputElementRegistration],
	actions: [recordChange],
	recipes: [WizardRecipe],
});

const config: FormConfigView = engine.defineForm({
	id: 'watcher-form',
	actions: [{ $type: 'record-change', id: 'record-change' }],
	steps: [{ id: 'main', title: 'Main', elements: [] }],
});

const dispatchTrigger = vi.fn(async () => []);

function Watcher({ onChange }: { onChange?: (values: FormValues) => void }) {
	const { container } = useFormStateContext();
	useFormChangeEffect({ container, config, onChange, dispatchTrigger });
	return null;
}

function SetValueOnMount() {
	const { setValue } = useFormContext();
	useEffect(() => setValue('email', 'prefilled'), [setValue]);
	return null;
}

function SetValueOnVersionChange({ version }: { version: number }) {
	const { setValue } = useFormContext();
	useEffect(() => {
		if (version > 0) setValue('email', `draft-${version}`);
	}, [setValue, version]);
	return null;
}

function EmailInput() {
	const { value, onChange } = useFormField({ $type: 'input', name: 'email', id: 'email' });
	return <input aria-label="Email" value={fieldText(value)} onChange={(event) => onChange(event.target.value)} />;
}

const defaults = { email: '', contacts: [{ email: '' }] };

function WatcherHarness({
	onChange,
	version = 0,
	setValueOnMount = false,
	container,
}: {
	onChange?: (values: FormValues) => void;
	version?: number;
	setValueOnMount?: boolean;
	container: ReturnType<typeof createTestContainer>;
}) {
	return (
		<ContainerHarness container={container}>
			<Watcher onChange={onChange} />
			{setValueOnMount && <SetValueOnMount />}
			<SetValueOnVersionChange version={version} />
			<EmailInput />
		</ContainerHarness>
	);
}

describe('useFormChangeEffect', () => {
	beforeEach(() => {
		dispatchTrigger.mockClear();
	});

	test('notifies after reset replaces the form values', async () => {
		const onChange = vi.fn();
		const container = createTestContainer({ defaults });
		render(<WatcherHarness container={container} onChange={onChange} />);

		await userEvent.fill(screen.getByRole('textbox', { name: 'Email' }), 'edited');
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ email: 'edited', contacts: [{ email: '' }] }));
		const priorCalls = onChange.mock.calls.length;

		act(() => container.reset({ email: 'reset', contacts: [{ email: '' }] }));

		await waitFor(() => {
			expect(onChange).toHaveBeenCalledTimes(priorCalls + 1);
			expect(onChange).toHaveBeenLastCalledWith({ email: 'reset', contacts: [{ email: '' }] });
		});
	});

	test('notifies when a child sets a value during mount', async () => {
		const onChange = vi.fn();

		render(<WatcherHarness container={createTestContainer({ defaults })} onChange={onChange} setValueOnMount />);

		await waitFor(() => expect(onChange).toHaveBeenCalledWith({ email: 'prefilled', contacts: [{ email: '' }] }));
	});

	test('uses the latest callback when a child effect changes a value in the same commit', async () => {
		const oldOnChange = vi.fn();
		const newOnChange = vi.fn();
		const container = createTestContainer({ defaults });
		const view = render(<WatcherHarness container={container} onChange={oldOnChange} />);

		view.rerender(<WatcherHarness container={container} onChange={newOnChange} version={1} />);

		await waitFor(() => expect(newOnChange).toHaveBeenCalledWith({ email: 'draft-1', contacts: [{ email: '' }] }));
		expect(oldOnChange).not.toHaveBeenCalled();
	});

	test('notifies once for a field array row update', async () => {
		const onChange = vi.fn();
		const container = createTestContainer({ defaults });
		render(<WatcherHarness container={container} onChange={onChange} />);

		act(() => container.setValue('contacts.0.email', 'row update'));

		await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
		expect(onChange).toHaveBeenCalledWith({ email: '', contacts: [{ email: 'row update' }] });
		expect(dispatchTrigger).toHaveBeenCalledTimes(1);
	});

	test('does not notify for an error, a touch or a validation', async () => {
		const onChange = vi.fn();
		const container = createTestContainer({
			elements: [{ $type: 'input', name: 'email', rules: [{ type: 'required', message: 'Required' }] }],
			defaults,
		});
		render(<WatcherHarness container={container} onChange={onChange} />);

		await act(async () => {
			container.blur('email');
			await container.validate();
		});

		expect(container.getSnapshot().errors).not.toEqual({});
		expect(onChange).not.toHaveBeenCalled();
		expect(dispatchTrigger).not.toHaveBeenCalled();
	});
});
