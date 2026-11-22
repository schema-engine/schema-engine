import { describe, expect, test, vi } from 'vitest';
import { fill, setup, wizardConfig } from './fixture';

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
		const { submission, steps } = runtime.getSnapshot();
		expect(submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
		expect(steps.current).toBe('contact');
		expect(steps.list.map(({ visited, complete }) => [visited, complete])).toEqual([
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
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		expect(runtime.getSnapshot().steps.navigating).toBe(false);
		expect(await runtime.next()).toBe('invalid');
	});

	test('is what a reset action does: form.reset resets the runtime too', async () => {
		const { runtime } = setup();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		runtime.container.reset({ email: 'x@y.z' });
		expect(runtime.getSnapshot().steps.current).toBe('contact');
		expect(runtime.container.getSnapshot().generation).toBe(1);
	});
});

describe('mount', () => {
	test('dispatches form_mount once for the runtime, however often it mounts', () => {
		const { runtime, seen, stop } = setup();
		const count = () => seen.filter(({ trigger }) => trigger === 'form_mount').length;
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				expect(count()).toBe(1);
				stop();
				runtime.mount();
				setTimeout(() => {
					expect(count()).toBe(1);
					resolve();
				}, 0);
			}, 0);
		});
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

	test('notifies subscribers when the steps or the submission change', async () => {
		const { runtime } = setup();
		const listener = vi.fn();
		runtime.subscribe(listener);
		fill(runtime, { email: 'a@b.c' });
		listener.mockClear();
		await runtime.next();
		expect(listener).toHaveBeenCalled();
		expect(runtime.getSnapshot().steps.current).toBe('address');
	});

	test('the server snapshot is the first step with a fresh submission, and never changes', async () => {
		const { runtime } = setup();
		const server = runtime.getServerSnapshot();
		fill(runtime, { email: 'a@b.c' });
		await runtime.next();
		expect(runtime.getServerSnapshot()).toBe(server);
		expect(server.steps.current).toBe('contact');
		expect(server.submission).toEqual({ status: 'idle', failures: [], submitCount: 0 });
	});
});
