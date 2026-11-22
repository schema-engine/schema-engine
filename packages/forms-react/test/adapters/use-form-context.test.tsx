import { describe, expect, test } from 'vitest';
import { act, render } from '@testing-library/react';
import { useFormContext } from '@/adapters';
import type { FormContextValue } from '@/adapters';
import type { SubmissionStatusStore } from '@/adapters/submission-status';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

const elements = [{ $type: 'input', name: 'name', rules: [{ type: 'required', message: 'Required' }] }];

function mount(read: (context: FormContextValue) => unknown, formatIssue?: (issue: { type: string }) => string) {
	let renders = 0;
	let status!: SubmissionStatusStore;
	let latest!: FormContextValue;
	const container = createTestContainer({ elements, defaults: { name: '' }, validationMode: 'onChange' });
	function Reader() {
		const context = useFormContext();
		latest = context;
		read(context);
		renders += 1;
		return null;
	}
	render(
		<ContainerHarness container={container} formatIssue={formatIssue} onStatus={(next) => (status = next)}>
			<Reader />
		</ContainerHarness>,
	);
	return { container, status: () => status, renders: () => renders, context: () => latest };
}

describe('useFormContext', () => {
	test('a caller that reads only isSubmitting does not re-render while values and errors change', async () => {
		const { container, status, renders } = mount(({ formState }) => formState.isSubmitting);
		const afterMount = renders();

		await act(async () => container.setValue('name', 'ada'));
		await act(async () => container.setValue('name', ''));
		await act(() => container.validate());
		expect(renders()).toBe(afterMount);

		act(() => {
			status().begin();
		});
		expect(renders()).toBeGreaterThan(afterMount);
	});

	test('a caller that reads errors re-renders when an error appears, with the text of the issue', async () => {
		let seen: Record<string, { message?: string }> = {};
		const { container, renders } = mount(({ formState }) => {
			seen = formState.errors;
		});
		const afterMount = renders();

		await act(() => container.validate());

		expect(renders()).toBeGreaterThan(afterMount);
		expect(seen).toEqual({ name: { message: 'Required' } });
	});

	test('isValid reports recorded errors and validates nothing', async () => {
		let isValid: boolean | undefined;
		const { container } = mount(({ formState }) => {
			isValid = formState.isValid;
		});
		expect(isValid).toBe(true);

		await act(() => container.validate());

		expect(isValid).toBe(false);
	});

	test('keeps the public formState shape', () => {
		const { context } = mount(() => undefined);

		expect(Object.keys(context().formState).sort()).toEqual([
			'defaultValues',
			'errors',
			'isSubmitting',
			'isValid',
			'submitCount',
			'touchedFields',
		]);
	});

	test('counts the submissions that ended and no other', () => {
		let submitCount = 0;
		const { status } = mount(({ formState }) => {
			submitCount = formState.submitCount;
		});

		act(() => {
			status().begin();
			status().end(true);
			status().begin();
			status().end(false);
		});

		expect(submitCount).toBe(1);
	});

	test('returns the same object for the life of the form', async () => {
		const { container, context } = mount(({ formState }) => formState.errors);
		const first = context();

		await act(() => container.validate());

		expect(context()).toBe(first);
	});

	test('setValue passes the native fact of a control with the value', () => {
		const { container, context } = mount(() => undefined);

		act(() => {
			context().setValue('name', 'x', { native: { type: 'typeMismatch' } });
		});

		expect(container.getValue('name')).toBe('x');
	});

	test('trigger validates the named field and resolves whether it passed', async () => {
		const { context } = mount(() => undefined);

		await expect(context().trigger('name')).resolves.toBe(false);
		await expect(context().trigger(['name'])).resolves.toBe(false);
	});
});
