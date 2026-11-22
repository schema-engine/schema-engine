import { describe, expect, test } from 'vitest';
import { fill, setup, wizardConfig } from './fixture';

const stepTriggers = (seen: ReturnType<typeof setup>['seen']) =>
	seen.filter(({ trigger }) => trigger.startsWith('step_')).map(({ trigger, stepId }) => `${trigger}:${stepId}`);

const ids = (runtime: ReturnType<typeof setup>['runtime']) => runtime.getSnapshot().steps.list.map(({ id }) => id);

describe('next', () => {
	test('validates the current step, focuses its errors and stays when they fail', async () => {
		const { runtime, host, seen } = setup();
		expect(await runtime.next()).toBe('invalid');
		expect(host.sync).toHaveBeenCalled();
		expect(host.focus).toHaveBeenCalledWith(['email']);
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		expect(runtime.getSnapshot().steps.list[0]).toMatchObject({ id: 'contact', invalid: true, complete: false });
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
		expect(stepTriggers(seen)).toEqual([]);
	});

	test('marks the step complete and moves to the next active step, firing leave, change and enter around the change', async () => {
		const { runtime, seen } = setup();
		fill(runtime, { email: 'a@b.c', hasCompany: true });
		expect(await runtime.next()).toBe('moved');
		const { steps } = runtime.getSnapshot();
		expect(steps.current).toBe('company');
		expect(steps.list.map(({ id, visited, complete }) => [id, visited, complete])).toEqual([
			['contact', true, true],
			['company', true, false],
			['address', false, false],
			['payment', false, false],
		]);
		expect(stepTriggers(seen)).toEqual(['step_leave:contact', 'step_change:company', 'step_enter:company']);
	});

	test('never marks the form submitted: no count, no status', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		expect(runtime.getSnapshot().submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
	});

	test('is refused on the last active step, and validates nothing', async () => {
		const { runtime, host } = setup(wizardConfig(), {});
		fill(runtime, { email: 'a@b.c', street: 'x' });
		await runtime.next();
		await runtime.next();
		expect(runtime.getSnapshot().steps.current).toBe('payment');
		host.sync.mockClear();
		expect(await runtime.next()).toBe('refused');
		expect(host.sync).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().steps.current).toBe('payment');
	});

	test('is cancelled by a reset that comes while it validates, and focuses nothing', async () => {
		const { runtime, host } = setup();
		const pending = runtime.next();
		runtime.container.reset();
		expect(await pending).toBe('cancelled');
		expect(host.focus).not.toHaveBeenCalled();
	});
});

describe('a check that an edit outran', () => {
	test('ends overtaken: no focus, no move, and the next attempt may succeed', async () => {
		const { runtime, host, gate } = setup(wizardConfig({}, [{ type: 'gate' }]));
		const release = async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			gate.waiting.splice(0).forEach((resolve) => resolve());
		};
		const moving = runtime.next();
		await new Promise((resolve) => setTimeout(resolve, 0));
		runtime.container.setValue('email', 'b');
		await release();
		await new Promise((resolve) => setTimeout(resolve, 0));
		runtime.container.setValue('email', 'c');
		await release();
		await release();
		expect(await moving).toBe('overtaken');
		expect(host.focus).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		const again = runtime.next();
		await release();
		expect(await again).toBe('moved');
	});
});

describe('back', () => {
	test('moves to the previous active step without validating, and is refused on the first', async () => {
		const { runtime, host } = setup();
		expect(await runtime.back()).toBe('refused');
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		host.sync.mockClear();
		expect(await runtime.back()).toBe('moved');
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		expect(host.sync).not.toHaveBeenCalled();
	});

	test('passes over a skipped step', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		expect(runtime.getSnapshot().steps.current).toBe('address');
		await runtime.back();
		expect(runtime.getSnapshot().steps.current).toBe('contact');
	});
});

describe('goTo', () => {
	test('refuses an unknown step, a skipped step and the current step', async () => {
		const { runtime } = setup();
		expect(await runtime.goTo('nowhere')).toBe('refused');
		expect(await runtime.goTo('company')).toBe('refused');
		expect(await runtime.goTo('contact')).toBe('refused');
	});

	test('linear: reaches only visited steps going forward, and always goes back', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c', street: 's', hasCompany: false });
		expect(await runtime.goTo('payment')).toBe('refused');
		await runtime.next();
		await runtime.next();
		expect(runtime.getSnapshot().steps.current).toBe('payment');
		expect(await runtime.goTo('contact')).toBe('moved');
		expect(await runtime.goTo('payment')).toBe('moved');
		expect(runtime.getSnapshot().steps.current).toBe('payment');
	});

	test('linear: validates the current step and every active step between, landing on the first that fails', async () => {
		const { runtime, host } = setup();
		fill(runtime, { email: 'a@b.c', street: 's' });
		await runtime.next();
		await runtime.next();
		await runtime.goTo('contact');
		runtime.container.setValue('street', '');
		runtime.container.setValue('email', '');
		expect(await runtime.goTo('payment')).toBe('invalid');
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		expect(host.focus).toHaveBeenLastCalledWith(['email']);

		runtime.container.setValue('email', 'a@b.c');
		expect(await runtime.goTo('payment')).toBe('invalid');
		expect(runtime.getSnapshot().steps.current).toBe('address');
		expect(runtime.getSnapshot().steps.list.find(({ id }) => id === 'contact')?.complete).toBe(true);
		expect(host.focus).toHaveBeenLastCalledWith(['street']);

		runtime.container.setValue('street', 's');
		expect(await runtime.goTo('payment')).toBe('moved');
		expect(runtime.getSnapshot().steps.current).toBe('payment');
	});

	test('free: reaches any active step without validating, and a skipped one is still refused', async () => {
		const { runtime, host } = setup(wizardConfig({ navigation: 'free' }));
		expect(await runtime.goTo('payment')).toBe('moved');
		expect(host.sync).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().steps.list.find(({ id }) => id === 'contact')?.complete).toBe(false);
		expect(await runtime.goTo('company')).toBe('refused');
		expect(await runtime.next()).toBe('refused');
	});

	test('free: next still validates', async () => {
		const { runtime } = setup(wizardConfig({ navigation: 'free' }));
		expect(await runtime.next()).toBe('invalid');
	});
});

describe('skipped steps', () => {
	test('the list says which steps are skipped, from the values, and counts them in step order', async () => {
		const { runtime } = setup();
		expect(ids(runtime)).toEqual(['contact', 'company', 'address', 'payment']);
		expect(runtime.getSnapshot().steps.list.map(({ skipped }) => skipped)).toEqual([false, true, false, false]);
		runtime.container.setValue('hasCompany', true);
		expect(runtime.getSnapshot().steps.list.map(({ skipped }) => skipped)).toEqual([false, false, false, false]);
	});

	test('the fields of a skipped step take no part in a submission, and its values are kept', async () => {
		const submitted: unknown[] = [];
		const { runtime } = setup(wizardConfig(), { onSubmit: (values) => void submitted.push(values) });
		fill(runtime, { email: 'a@b.c', street: 's', card: 'c', companyName: '' });
		await runtime.next();
		await runtime.next();
		expect(await runtime.submit()).toBe('submitted');
		expect(submitted).toEqual([{ email: 'a@b.c', street: 's', card: 'c' }]);
		expect(runtime.container.getSnapshot().values).toMatchObject({ companyName: '' });
	});

	test('the current step becoming skipped moves back to the nearest active step, firing the step triggers', async () => {
		const { runtime, seen } = setup();
		fill(runtime, { email: 'a@b.c', hasCompany: true });
		await runtime.next();
		expect(runtime.getSnapshot().steps.current).toBe('company');
		seen.length = 0;
		runtime.container.setValue('hasCompany', false);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		expect(stepTriggers(seen)).toEqual(['step_leave:company', 'step_change:contact', 'step_enter:contact']);
	});

	test('a step that becomes skipped ahead of the current one is passed over', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c', hasCompany: true });
		runtime.container.setValue('hasCompany', false);
		await runtime.next();
		expect(runtime.getSnapshot().steps.current).toBe('address');
	});

	test('the position and total of the action context count only active steps', async () => {
		const { runtime, seen } = setup();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		const enter = seen.find(({ trigger }) => trigger === 'step_enter');
		expect(enter).toMatchObject({ stepId: 'address', currentStep: 1, totalSteps: 3 });
	});
});

describe('step triggers', () => {
	test('fire only when the current step changes', async () => {
		const { runtime, seen } = setup();
		await runtime.next();
		await runtime.goTo('contact');
		expect(stepTriggers(seen)).toEqual([]);
	});

	test('cannot block a move: a failing step action is reported through onActionResults and the step still changes', async () => {
		const reported: string[] = [];
		const { runtime, failing } = setup(wizardConfig(), {
			onActionResults: (results, trigger) => void reported.push(`${trigger}:${results.length}`),
		});
		failing.add('step_leave');
		fill(runtime, { email: 'a@b.c' });
		expect(await runtime.next()).toBe('moved');
		expect(runtime.getSnapshot().steps.current).toBe('address');
		expect(reported).toContain('step_leave:1');
	});
});

describe('the lock', () => {
	test('a command made while another runs ends busy, whichever the pair', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c' });
		const first = runtime.next();
		expect(runtime.getSnapshot().steps.navigating).toBe(true);
		expect(await runtime.next()).toBe('busy');
		expect(await runtime.back()).toBe('busy');
		expect(await runtime.goTo('address')).toBe('busy');
		expect(await runtime.submit()).toBe('busy');
		expect(await first).toBe('moved');
		expect(runtime.getSnapshot().steps.navigating).toBe(false);
	});

	test('Next and submit cannot interleave on the last step', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c', street: 's', card: 'c' });
		await runtime.next();
		await runtime.next();
		const submitting = runtime.submit();
		expect(runtime.getSnapshot().submission.status).toBe('pending');
		expect(await runtime.next()).toBe('busy');
		expect(await runtime.submit()).toBe('busy');
		expect(await submitting).toBe('submitted');
	});
});
