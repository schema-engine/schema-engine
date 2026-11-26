import { describe, expect, test, vi } from 'vitest';
import { createFormRuntime } from '@/runtime';
import { createFixture, createHost, fill, setup, wizardConfig } from './fixture';

describe('a direct container.reset()', () => {
	test('returns the submission to idle with no count and the steps to the first, firing no step trigger', async () => {
		const { runtime, seen, failing } = setup();
		fill(runtime, { email: 'a@b.c', street: 's', card: 'c' });
		await runtime.next();
		await runtime.next();
		failing.add('form_submit');
		await runtime.submit();
		expect(runtime.getSnapshot().submission.submitCount).toBe(1);
		seen.length = 0;
		runtime.container.reset();
		const { submission, steps, current } = runtime.getSnapshot();
		expect(submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
		expect(current).toBe('contact');
		expect(steps.map(({ visited, complete }) => [visited, complete])).toEqual([
			[true, false],
			[false, false],
			[false, false],
			[false, false],
		]);
		expect(seen.filter(({ trigger }) => trigger.startsWith('step_'))).toEqual([]);
	});

	test('revokes the command in flight: it ends cancelled and writes nothing', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c' });
		const moving = runtime.next();
		runtime.container.reset();
		expect(await moving).toBe('cancelled');
		expect(runtime.getSnapshot().current).toBe('contact');
		expect(runtime.getSnapshot().navigating).toBe(false);
		expect(await runtime.next()).toBe('invalid');
	});

	test('is what a reset action does: form.reset resets the runtime too', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		runtime.container.reset({ email: 'x@y.z' });
		expect(runtime.getSnapshot().current).toBe('contact');
		expect(runtime.container.getSnapshot().generation).toBe(1);
	});
});

describe('mount', () => {
	test('dispatches form_mount once for the runtime, however often it mounts', async () => {
		const { runtime, seen, stop } = setup();
		const count = () => seen.filter(({ trigger }) => trigger === 'form_mount').length;
		await vi.waitFor(() => expect(count()).toBe(1));
		stop();
		runtime.mount();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(count()).toBe(1);
	});

	test('reports a change of the values to onChange and form_change, and nothing else', async () => {
		const onChange = vi.fn();
		const { runtime, seen } = setup(wizardConfig(), { onChange });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onChange).not.toHaveBeenCalled();
		runtime.container.blur('email');
		await runtime.container.validate();
		expect(onChange).not.toHaveBeenCalled();
		runtime.container.setValue('email', 'a@b.c');
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledOnce());
		await vi.waitFor(() => expect(seen.filter(({ trigger }) => trigger === 'form_change')).toHaveLength(1));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onChange).toHaveBeenCalledOnce();
		expect(seen.filter(({ trigger }) => trigger === 'form_change')).toHaveLength(1);
	});

	test('the cleanup stops the watch and revokes the command in flight', async () => {
		const onChange = vi.fn();
		const { runtime, stop } = setup(wizardConfig(), { onChange });
		fill(runtime, { email: 'a@b.c' });
		onChange.mockClear();
		const moving = runtime.next();
		stop();
		expect(await moving).toBe('cancelled');
		runtime.container.setValue('email', 'z@b.c');
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe('the snapshot', () => {
	test('keeps its identity while nothing changed, even when the values did', () => {
		const { runtime } = setup();
		const before = runtime.getSnapshot();
		expect(runtime.getSnapshot()).toBe(before);
		runtime.container.setValue('street', 'x');
		expect(runtime.getSnapshot()).toBe(before);
	});

	test('carries each step title from the config, in the live and the server snapshot, through moves and keystrokes', async () => {
		const { runtime } = setup();
		const titles = ['Contact', 'Company', 'Address', 'Payment'];
		const before = runtime.getSnapshot();
		expect(before.steps.map(({ title }) => title)).toEqual(titles);
		expect(runtime.getServerSnapshot().steps.map(({ title }) => title)).toEqual(titles);
		runtime.container.setValue('street', 'x');
		expect(runtime.getSnapshot().steps).toBe(before.steps);
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		const after = runtime.getSnapshot();
		expect(after.current).toBe('address');
		expect(after.steps.map(({ title }) => title)).toEqual(titles);
	});

	test('notifies subscribers when the steps or the submission change', async () => {
		const { runtime } = setup();
		const listener = vi.fn();
		runtime.subscribe(listener);
		fill(runtime, { email: 'a@b.c' });
		listener.mockClear();
		await runtime.next();
		expect(listener).toHaveBeenCalled();
		expect(runtime.getSnapshot().current).toBe('address');
	});

	test('the server snapshot is the first step with a fresh submission, and never changes', async () => {
		const { runtime } = setup();
		const server = runtime.getServerSnapshot();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		expect(runtime.getServerSnapshot()).toBe(server);
		expect(server.current).toBe('contact');
		expect(server.submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
	});
});

describe('actions in flight and before mount', () => {
	const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

	test('fire no step trigger before the runtime mounts', async () => {
		const fixture = createFixture();
		const runtime = createFormRuntime({
			engine: fixture.engine,
			config: fixture.engine.validateForm(wizardConfig()),
			host: createHost(),
		});
		fill(runtime, { email: 'a@b.c' });
		expect(await runtime.next()).toBe('moved');
		await tick();
		expect(fixture.seen).toEqual([]);
	});

	test('report no results of form_change after an unmount', async () => {
		const results = vi.fn();
		const { runtime, stop, failing } = setup(wizardConfig(), { onActionResults: results });
		await vi.waitFor(() => expect(results).toHaveBeenCalledWith(expect.anything(), 'form_mount'));
		results.mockClear();
		failing.clear();
		runtime.container.setValue('email', 'x');
		stop();
		await tick();
		expect(results.mock.calls.map((call) => call[1])).not.toContain('form_change');
	});

	test('report the results of the form_change a reset itself makes, and not those of the change it cancelled', async () => {
		const results = vi.fn();
		const { runtime, seen } = setup(wizardConfig(), { onActionResults: results });
		await vi.waitFor(() => expect(results).toHaveBeenCalledWith(expect.anything(), 'form_mount'));
		results.mockClear();
		seen.length = 0;
		runtime.container.setValue('email', 'x');
		runtime.container.reset();
		const changes = () => results.mock.calls.filter((call) => call[1] === 'form_change');
		await vi.waitFor(() => expect(changes()).toHaveLength(1));
		await tick();
		expect(changes()).toHaveLength(1);
		expect(seen.filter(({ trigger }) => trigger === 'form_change')).toHaveLength(2);
	});

	test('a container change after an unmount moves nothing and fires no trigger', async () => {
		const { runtime, stop, seen } = setup();
		fill(runtime, { email: 'a@b.c', hasCompany: true });
		await runtime.next();
		stop();
		seen.length = 0;
		runtime.container.setValue('hasCompany', false);
		await tick();
		expect(seen).toEqual([]);
		expect(runtime.getSnapshot().current).toBe('company');
	});
});
