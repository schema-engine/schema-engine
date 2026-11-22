import { describe, expect, test } from 'vitest';
import { act, render } from '@testing-library/react';
import { useFormContext, FORM_ROOT } from '../../src/hooks/form-state';
import type { FormContextValue } from '../../src/hooks/form-state';
import type { SubmissionStore } from '../../src/hooks/form-state/submission-store';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

const elements = [{ $type: 'input', name: 'name', rules: [{ type: 'required', message: 'Required' }] }];

function mount(
	read: (context: FormContextValue) => unknown,
	formatIssue?: (issue: { type: string; message?: string }) => string,
) {
	let renders = 0;
	let submission!: SubmissionStore;
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
		<ContainerHarness container={container} formatIssue={formatIssue} onSubmission={(next) => (submission = next)}>
			<Reader />
		</ContainerHarness>,
	);
	return { container, submission: () => submission, renders: () => renders, context: () => latest };
}

describe('useFormContext', () => {
	test('a caller that reads only isSubmitting does not re-render while values and errors change', async () => {
		const { container, submission, renders } = mount(({ formState }) => formState.isSubmitting);
		const afterMount = renders();

		await act(async () => container.setValue('name', 'ada'));
		await act(async () => container.setValue('name', ''));
		await act(() => container.validate());
		expect(renders()).toBe(afterMount);

		act(() => {
			submission().begin();
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
			'errors',
			'isSubmitting',
			'isValid',
			'submission',
			'submitCount',
		]);
	});

	test('counts the submissions that ended and no other', () => {
		let submitCount = 0;
		const { submission } = mount(({ formState }) => {
			submitCount = formState.submitCount;
		});

		act(() => {
			submission().begin();
			submission().settle('success', { counted: true });
			submission().begin();
			submission().settle('idle');
		});

		expect(submitCount).toBe(1);
	});

	test('isSubmitting holds while a submission is pending', () => {
		let isSubmitting = false;
		const { submission } = mount(({ formState }) => {
			isSubmitting = formState.isSubmitting;
		});

		act(() => submission().begin());
		expect(isSubmitting).toBe(true);

		act(() => submission().settle('success', { counted: true }));
		expect(isSubmitting).toBe(false);
	});

	test('the submission is its status and failures, and a count alone does not re-render a reader of it', () => {
		let seen: FormContextValue['formState']['submission'] | undefined;
		const { submission, renders } = mount(({ formState }) => {
			seen = formState.submission;
		});
		expect(seen).toMatchObject({ status: 'idle', failures: [] });
		const afterMount = renders();

		act(() => {
			submission().begin();
			submission().settle('idle');
			submission().settle('idle', { counted: true });
		});
		const failure = { type: 'callbackFailed', source: 'submission', message: 'down' } as const;
		act(() => submission().settle('error', { failures: [failure], counted: true }));

		expect(seen).toEqual({ status: 'error', failures: [failure] });
		expect(renders()).toBeGreaterThan(afterMount);
	});

	test('clearSubmission hides the outcome and keeps the count', () => {
		let state: Pick<FormContextValue['formState'], 'submission' | 'submitCount'> | undefined;
		const { submission, context } = mount(({ formState }) => {
			state = { submission: formState.submission, submitCount: formState.submitCount };
		});
		act(() => {
			submission().begin();
			submission().settle('error', {
				failures: [{ type: 'triggerFailed', source: 'submission' }],
				counted: true,
			});
		});

		act(() => context().clearSubmission());

		expect(state).toEqual({ submission: { status: 'idle', failures: [] }, submitCount: 1 });
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

	test('reset restores the defaults, clears the errors and the submission count', async () => {
		let submitCount = 0;
		const { container, submission, context } = mount(({ formState }) => {
			submitCount = formState.submitCount;
		});
		container.setValue('name', 'ada');
		await act(() => container.validate());
		act(() => {
			submission().begin();
			submission().settle('success', { counted: true });
		});

		act(() => context().reset());

		expect(container.getValue('name')).toBe('');
		expect(container.getSnapshot().errors).toEqual({});
		expect(submitCount).toBe(0);
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
