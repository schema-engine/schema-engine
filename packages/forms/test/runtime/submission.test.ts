import { describe, expect, test, vi } from 'vitest';
import { FORM_ROOT } from '@/state-container';
import { fill, setup, wizardConfig } from './fixture';

const toLastStep = async (runtime: ReturnType<typeof setup>['runtime']) => {
	fill(runtime, { email: 'a@b.c', street: 's' });
	await runtime.next();
	await runtime.next();
};

describe('submit before the last active step', () => {
	test('acts as next: validates the step and moves, and counts no submission', async () => {
		const onSubmit = vi.fn();
		const { runtime, host } = setup(wizardConfig(), { onSubmit });
		expect(await runtime.submit()).toBe('invalid');
		expect(host.focus).toHaveBeenCalledWith(['email']);
		fill(runtime, { email: 'a@b.c' });
		expect(await runtime.submit()).toBe('moved');
		expect(runtime.getSnapshot().current).toBe('address');
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('submit on the last active step', () => {
	test('runs the actions and onSubmit with the values that passed, then reports success and counts the submission', async () => {
		const onSubmit = vi.fn();
		const onAction = vi.fn();
		const { runtime, seen } = setup(wizardConfig(), { onSubmit, onAction });
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		expect(await runtime.submit()).toBe('submitted');
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(onSubmit.mock.calls[0]?.[0]).toEqual({ email: 'a@b.c', street: 's', card: 'c' });
		expect(onSubmit.mock.calls[0]?.[1]).toHaveProperty('setServerErrors');
		expect(onAction).toHaveBeenCalledOnce();
		expect(seen.map(({ trigger }) => trigger).filter((trigger) => trigger.startsWith('form_submit'))).toEqual([
			'form_submit_start',
			'form_submit',
			'form_submit_success',
			'form_submit_complete',
		]);
		expect(runtime.getSnapshot().submission).toEqual({ status: 'success', failures: [], submitCount: 1 });
	});

	test('hands the host the native submit once a submission succeeded, and not after a failure', async () => {
		const { runtime, host, failing } = setup();
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		failing.add('form_submit');
		expect(await runtime.submit()).toBe('failed');
		expect(host.submitNatively).not.toHaveBeenCalled();
		failing.clear();
		expect(await runtime.submit()).toBe('submitted');
		expect(host.submitNatively).toHaveBeenCalledOnce();
	});

	test('is pending while it runs, and counts a submission that failed validation', async () => {
		const { runtime } = setup();
		await toLastStep(runtime);
		const running = runtime.submit();
		expect(runtime.getSnapshot().submission.status).toBe('pending');
		expect(await running).toBe('invalid');
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 1 });
	});

	test('on invalid moves to the first active step with an error, firing the step triggers, and focuses its fields', async () => {
		const { runtime, seen, host } = setup();
		await toLastStep(runtime);
		runtime.container.setValue('email', '');
		runtime.container.setValue('street', '');
		seen.length = 0;
		expect(await runtime.submit()).toBe('invalid');
		expect(runtime.getSnapshot().current).toBe('contact');
		expect(seen.filter(({ trigger }) => trigger.startsWith('step_')).map(({ trigger }) => trigger)).toEqual([
			'step_leave',
			'step_change',
			'step_enter',
		]);
		expect(host.focus).toHaveBeenLastCalledWith(['email']);
		expect(runtime.getSnapshot().steps.map(({ invalid }) => invalid)).toEqual([true, false, true, true]);
	});

	test('on invalid stays on a step that is the first with an error and focuses it', async () => {
		const { runtime, host } = setup();
		await toLastStep(runtime);
		expect(await runtime.submit()).toBe('invalid');
		expect(runtime.getSnapshot().current).toBe('payment');
		expect(host.focus).toHaveBeenLastCalledWith(['card']);
	});

	test('a server error about the form itself stays put and focuses nothing', async () => {
		const { runtime, host } = setup(wizardConfig(), {
			onSubmit: (_values, { setServerErrors }) => setServerErrors({ [FORM_ROOT]: { message: 'Try later' } }),
		});
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		host.focus.mockClear();
		expect(await runtime.submit()).toBe('submitted');
		expect(runtime.getSnapshot().current).toBe('payment');
		expect(host.focus).not.toHaveBeenCalled();
	});

	test('a server error on an earlier step moves there, by the same rule, so it is never invisible', async () => {
		const { runtime, host, seen } = setup(wizardConfig(), {
			onSubmit: (_values, { setServerErrors }) => setServerErrors({ email: { type: 'taken' } }),
		});
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		seen.length = 0;
		expect(await runtime.submit()).toBe('submitted');
		expect(runtime.getSnapshot().current).toBe('contact');
		expect(host.focus).toHaveBeenLastCalledWith(['email']);
		expect(seen.filter(({ trigger }) => trigger === 'step_enter')).toHaveLength(1);
	});

	test('overtaken by an edit: no verdict, nothing shown or counted', async () => {
		const { runtime, host } = setup();
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		const running = runtime.submit();
		runtime.container.reset();
		expect(await running).toBe('cancelled');
		expect(host.focus).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
	});
});

describe('what a failed submission reports', () => {
	test('an onSubmit that rejects is a callback failure, in the snapshot and not in the return value', async () => {
		const { runtime } = setup(wizardConfig(), {
			onSubmit: () => {
				throw new Error('server down');
			},
		});
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		expect(await runtime.submit()).toBe('failed');
		expect(runtime.getSnapshot().submission).toEqual({
			status: 'error',
			failures: [{ type: 'callbackFailed', source: 'submission', message: 'server down' }],
			submitCount: 1,
		});
	});

	test('an action that stops the submission is an action failure naming the action', async () => {
		const { runtime, failing } = setup();
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		failing.add('form_submit');
		expect(await runtime.submit()).toBe('failed');
		expect(runtime.getSnapshot().submission).toEqual({
			status: 'error',
			failures: [
				{
					type: 'actionFailed',
					source: 'submission',
					params: { actionId: 'probe-form' },
					message: 'probe failed',
				},
			],
			submitCount: 1,
		});
	});

	test('clearSubmission hides the outcome and keeps the count', async () => {
		const { runtime, failing } = setup();
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		failing.add('form_submit');
		await runtime.submit();
		runtime.clearSubmission();
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 1 });
	});

	test('the results of the submit actions go to onActionResults once, under form_submit', async () => {
		const reported: string[] = [];
		const { runtime } = setup(wizardConfig(), {
			onActionResults: (results, trigger) => void reported.push(`${trigger}:${results.length}`),
		});
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		await runtime.submit();
		expect(reported.filter((entry) => entry.startsWith('form_submit:'))).toEqual(['form_submit:1']);
	});
});

describe('a submission a reset or an edit outran', () => {
	test('an edit that outruns its validation is overtaken: nothing is shown or counted, and the next submit may pass', async () => {
		const { runtime, host, gate } = setup(wizardConfig({}, [{ type: 'gate' }]));
		const release = async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			gate.waiting.splice(0).forEach((resolve) => resolve());
		};
		fill(runtime, { email: 'a@b.c', street: 's', card: 'c' });
		const first = runtime.next();
		await release();
		await first;
		await runtime.next();
		expect(runtime.getSnapshot().current).toBe('payment');

		const running = runtime.submit();
		await new Promise((resolve) => setTimeout(resolve, 0));
		runtime.container.setValue('card', 'd');
		await release();
		await new Promise((resolve) => setTimeout(resolve, 0));
		runtime.container.setValue('card', 'e');
		await release();
		await release();

		expect(await running).toBe('overtaken');
		expect(host.focus).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });

		const again = runtime.submit();
		await release();
		await release();
		expect(await again).toBe('submitted');
	});

	test('a reset while the submission validates cancels it: nothing is written, nothing is posted and no action runs', async () => {
		const onSubmit = vi.fn();
		const { runtime, seen, host } = setup(wizardConfig(), { onSubmit });
		await toLastStep(runtime);
		fill(runtime, { card: 'c' });
		const running = runtime.submit();
		runtime.container.reset();
		expect(await running).toBe('cancelled');
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
		expect(runtime.getSnapshot().current).toBe('contact');
		expect(host.submitNatively).not.toHaveBeenCalled();
		expect(seen.filter(({ trigger }) => trigger.startsWith('form_submit'))).toEqual([]);
	});
});
