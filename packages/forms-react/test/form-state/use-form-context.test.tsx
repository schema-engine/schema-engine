import { describe, expect, test } from 'vitest';
import { act, render } from '@testing-library/react';
import { useFormContext, FORM_ROOT } from '../../src/hooks/form-state';
import type { FormContextValue } from '../../src/hooks/form-state';
import { ContainerHarness, createTestContainer, runtimeOf } from '../utils/container-harness';

const elements = [{ $type: 'input', name: 'name', rules: [{ type: 'required', message: 'Required' }] }];

function mount(
	read: (context: FormContextValue) => unknown,
	formatIssue?: (issue: { type: string; message?: string }) => string,
	onSubmit?: () => void | Promise<void>,
) {
	let renders = 0;
	let latest!: FormContextValue;
	const container = createTestContainer({
		elements,
		defaults: { name: '' },
		validationMode: 'onChange',
		onSubmit,
	});
	function Reader() {
		const context = useFormContext();
		latest = context;
		read(context);
		renders += 1;
		return null;
	}
	render(
		<ContainerHarness container={container} formatIssue={formatIssue}>
			<Reader />
		</ContainerHarness>,
	);
	return { container, runtime: runtimeOf(container), renders: () => renders, context: () => latest };
}

describe('useFormContext', () => {
	test('a caller that reads only the submission does not re-render while values and errors change', async () => {
		const { container, runtime, renders } = mount(({ formState }) => formState.submission.status);
		const afterMount = renders();

		await act(async () => container.setValue('name', 'ada'));
		await act(async () => container.setValue('name', ''));
		await act(() => container.validate());
		expect(renders()).toBe(afterMount);

		await act(() => runtime.submit());
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

		expect(Object.keys(context().formState).sort()).toEqual(['errors', 'isValid', 'submission']);
	});

	test('the submission is the one state: pending while one runs, then how it ended, with the count of those that ended', async () => {
		const seen: Array<FormContextValue['formState']['submission']> = [];
		const { container, runtime } = mount(({ formState }) => {
			seen.push(formState.submission);
		});
		expect(seen.at(-1)).toEqual({ status: 'idle', failures: [], submitCount: 0 });

		let running!: Promise<unknown>;
		act(() => {
			running = runtime.submit();
		});
		expect(seen.at(-1)).toMatchObject({ status: 'pending' });
		await act(() => running);
		expect(seen.at(-1)).toEqual({ status: 'idle', failures: [], submitCount: 1 });

		container.setValue('name', 'ada');
		await act(() => runtime.submit());
		expect(seen.at(-1)).toEqual({ status: 'success', failures: [], submitCount: 2 });
	});

	test('a failed submission carries its failures as issues', async () => {
		let seen: FormContextValue['formState']['submission'] | undefined;
		const { container, runtime } = mount(
			({ formState }) => {
				seen = formState.submission;
			},
			undefined,
			() => {
				throw new Error('down');
			},
		);
		container.setValue('name', 'ada');

		await act(() => runtime.submit());

		expect(seen).toEqual({
			status: 'error',
			failures: [{ type: 'callbackFailed', source: 'submission', message: 'down' }],
			submitCount: 1,
		});
	});

	test('a count that ends a submission does not re-render a caller that reads only the errors', async () => {
		const { container, runtime, renders } = mount(({ formState }) => formState.errors);
		container.setValue('name', 'ada');
		const afterMount = renders();

		await act(() => runtime.submit());

		expect(renders()).toBe(afterMount);
	});

	test('clearSubmission hides the outcome and keeps the count', async () => {
		let seen: FormContextValue['formState']['submission'] | undefined;
		const { container, runtime, context } = mount(
			({ formState }) => {
				seen = formState.submission;
			},
			undefined,
			() => {
				throw new Error('down');
			},
		);
		container.setValue('name', 'ada');
		await act(() => runtime.submit());

		act(() => context().clearSubmission());

		expect(seen).toEqual({ status: 'idle', failures: [], submitCount: 1 });
	});

	test('formatIssue words a field issue and a submission failure with the same formatter, and falls back to the message', () => {
		const { context } = mount(
			() => undefined,
			(issue) => (issue.type === 'callbackFailed' ? 'We could not save' : ''),
		);

		expect(context().formatIssue({ type: 'callbackFailed', source: 'submission' }, { path: FORM_ROOT })).toBe(
			'We could not save',
		);
		expect(
			context().formatIssue(
				{ type: 'triggerFailed', source: 'submission', message: 'own text' },
				{ path: FORM_ROOT },
			),
		).toBe('own text');
		expect(
			context().formatIssue({ type: 'triggerFailed', source: 'submission' }, { path: FORM_ROOT }),
		).toBeUndefined();
	});

	test('reset returns the form to a fresh one: defaults, no errors, and an idle submission with no failures and no count', async () => {
		let seen: FormContextValue['formState']['submission'] | undefined;
		const { container, runtime, context } = mount(
			({ formState }) => {
				seen = formState.submission;
			},
			undefined,
			() => {
				throw new Error('down');
			},
		);
		container.setValue('name', 'ada');
		await act(() => runtime.submit());
		expect(seen).toMatchObject({ status: 'error', submitCount: 1 });

		act(() => context().reset());

		expect(container.getValue('name')).toBe('');
		expect(container.getSnapshot().errors).toEqual({});
		expect(seen).toEqual({ status: 'idle', failures: [], submitCount: 0 });
	});

	test('reset with values replaces the defaults', () => {
		const { container, context } = mount(() => undefined);

		act(() => context().reset({ name: 'new' }));
		act(() => context().setValue('name', 'edited'));
		act(() => context().reset());

		expect(container.getValue('name')).toBe('new');
	});

	test('returns the same object for the life of the form', async () => {
		const { container, context } = mount(({ formState }) => formState.errors);
		const first = context();

		await act(() => container.validate());

		expect(context()).toBe(first);
	});

	test('setValue writes the branch as a change', () => {
		const { container, context } = mount(() => undefined);

		act(() => context().setValue('name', 'x'));

		expect(context().getValues()).toEqual({ name: 'x' });
		expect(container.getSnapshot().dirty).toEqual({ name: true });
	});

	test('validate resolves whether the named field, or the whole form, passed', async () => {
		const { container, context } = mount(() => undefined);

		await expect(context().validate('name')).resolves.toBe(false);
		await expect(context().validate()).resolves.toBe(false);
		act(() => container.setValue('name', 'ada'));
		await expect(context().validate(['name'])).resolves.toBe(true);
		await expect(context().validate()).resolves.toBe(true);
	});
});
