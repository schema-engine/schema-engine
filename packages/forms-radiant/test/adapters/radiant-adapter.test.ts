import { describe, expect, test, vi } from 'vitest';
import { createFormRuntime } from '@schema-engine/forms';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FormController } from '@/adapters/radiant/controller';
import { createTestForm, provideTestRuntime } from './test-form';

describe('FormController over the form instance container', () => {
	test('hands over the runtime of the form now, and each runtime the instance replaces it with', () => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const config = engine.validateForm({ id: 'test', steps: [{ id: 'main', title: 'Main', elements: [] }] });
		const make = () => createFormRuntime({ engine, config, host: { focus: () => {} } });
		const [first, second] = [make(), make()];
		const element = document.createElement('div');
		const host = document.createElement('div');
		element.append(host);
		const provider = provideTestRuntime(element, first);
		const seen: Array<unknown> = [];

		const stop = new FormController(host).watchRuntime((runtime) => seen.push(runtime));
		expect(seen).toEqual([first]);

		provider.setContext({ ...provider.getContext(), runtime: first });
		expect(seen).toEqual([first]);
		provider.setContext({ ...provider.getContext(), runtime: second });
		expect(seen).toEqual([first, second]);

		stop();
		provider.setContext({ ...provider.getContext(), runtime: first });
		expect(seen).toEqual([first, second]);
	});

	test('selects from the snapshot with a signal that notifies only when the selection changes', () => {
		const { form, container } = createTestForm({ title: 'a', note: 'x' });
		const title = form.select((snapshot) => snapshot.values['title']);
		const listener = vi.fn();
		const stop = title.subscribe(listener);
		listener.mockClear();
		container.setValue('note', 'y');
		expect(listener).not.toHaveBeenCalled();
		container.setValue('title', 'b');
		expect(listener).toHaveBeenCalledTimes(1);
		expect(title.get()).toBe('b');
		stop();
	});

	test('shows an issue through the formatter of the form, else its message, never its type', () => {
		const { form } = createTestForm({}, [], (issue, { path }) => `${path}:${issue.type}`);
		expect(form.formatIssue({ type: 'required', source: 'validation' }, { path: 'title' })).toBe('title:required');

		const bare = createTestForm({});
		expect(bare.form.formatIssue({ type: 'minLength', source: 'validation' }, { path: 'title' })).toBeUndefined();
		expect(
			bare.form.formatIssue({ type: 'minLength', source: 'validation', message: 'Too short' }, { path: 'title' }),
		).toBe('Too short');
	});

	test('uses the nearest form and never selects an unrelated form', () => {
		const outer = createTestForm({ title: 'Outer' });
		const inner = createTestForm({ title: 'Inner' });
		outer.host.append(inner.element);
		expect(inner.form.container).toBe(inner.container);
		expect(outer.form.container).toBe(outer.container);
		expect(new FormController(document.createElement('div')).container).toBeUndefined();
	});

	test('reads the context when the host is the provider', () => {
		const { element, container } = createTestForm({ title: 'Direct' });
		expect(new FormController(element).container).toBe(container);
	});

	test('does not read a descendant form; the host must sit inside the instance', () => {
		const nested = createTestForm({ title: 'Nested' });
		const wrapper = document.createElement('div');
		wrapper.append(nested.element);
		expect(new FormController(wrapper).container).toBeUndefined();
	});

	test('a selection is total: undefined before the form has a container, and it binds when one arrives', () => {
		const element = document.createElement('div');
		const host = document.createElement('div');
		element.append(host);
		const provider = provideTestRuntime(element, undefined);
		const form = new FormController(host);
		const title = form.select((snapshot) => snapshot.values['title']);
		const listener = vi.fn();

		expect(title.get()).toBeUndefined();
		const stop = title.subscribe(listener);
		expect(title.get()).toBeUndefined();
		const { runtime } = createTestForm({ title: 'Arrived' });
		provider.setContext({ ...provider.getContext(), runtime });

		expect(listener).toHaveBeenCalled();
		expect(title.get()).toBe('Arrived');
		stop();
	});

	test('a selection reads undefined where there is no instance at all, as on the server', () => {
		const form = new FormController(document.createElement('div'));
		const rows = form.select((snapshot) => snapshot.rowIds['contacts']?.length ?? 0);

		expect(rows.get()).toBeUndefined();
		const stop = rows.subscribe(() => {});
		expect(rows.get()).toBeUndefined();
		stop();
	});

	test('a selection follows the container the instance replaces', () => {
		const first = createTestForm({ title: 'First' });
		const second = createTestForm({ title: 'Second' });
		const element = document.createElement('div');
		const host = document.createElement('div');
		element.append(host);
		const provider = provideTestRuntime(element, first.runtime);
		const form = new FormController(host);
		const title = form.select((snapshot) => snapshot.values['title']);
		const listener = vi.fn();
		const stop = title.subscribe(listener);
		expect(title.get()).toBe('First');
		listener.mockClear();

		provider.setContext({ ...provider.getContext(), runtime: second.runtime });

		expect(form.container).toBe(second.container);
		expect(title.get()).toBe('Second');
		second.container.setValue('title', 'Edited');
		expect(title.get()).toBe('Edited');
		first.container.setValue('title', 'Ignored');
		expect(title.get()).toBe('Edited');
		expect(listener).toHaveBeenCalled();
		stop();
	});

	describe('wizard', () => {
		const wizardFields = [
			{ id: 'a', title: 'A', elements: [{ $type: 'input', id: 'title', name: 'title', label: 'Title' }] },
			{ id: 'b', title: 'B', elements: [] },
		];
		const createWizardRuntime = () => {
			const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
			const config = engine.validateForm({ id: 'wizard', steps: wizardFields });
			return createFormRuntime({ engine, config, host: { focus: () => {} } });
		};

		test('reads undefined while the form has no runtime, and on a host with no instance', () => {
			const orphan = new FormController(document.createElement('div'));
			expect(orphan.wizard.get()).toBeUndefined();
			expect(orphan.submission.get()).toBeUndefined();
			expect(() => orphan.clearSubmission()).not.toThrow();

			const element = document.createElement('div');
			const host = document.createElement('div');
			element.append(host);
			provideTestRuntime(element, undefined);
			const form = new FormController(host);
			const stop = form.wizard.subscribe(() => {});
			expect(form.wizard.get()).toBeUndefined();
			expect(form.submission.get()).toBeUndefined();
			stop();
		});

		test('reads the current step, the steps and the commands of the runtime, and notifies when a step moves', async () => {
			const runtime = createWizardRuntime();
			const element = document.createElement('div');
			const host = document.createElement('div');
			element.append(host);
			provideTestRuntime(element, runtime);
			const form = new FormController(host);
			const listener = vi.fn();
			const stop = form.wizard.subscribe(listener);
			listener.mockClear();

			const first = form.wizard.get();
			expect(first?.current).toBe('a');
			expect(first?.steps.map(({ id }) => id)).toEqual(['a', 'b']);
			expect(first?.steps.map(({ title }) => title)).toEqual(['A', 'B']);
			expect(first?.next).toBe(runtime.next);
			expect(first?.goTo).toBe(runtime.goTo);

			await expect(first?.next()).resolves.toBe('moved');
			expect(form.wizard.get()?.current).toBe('b');
			expect(listener).toHaveBeenCalled();
			stop();
		});

		test('keeps the wizard object, and does not notify, while a value or the submission changes', async () => {
			const runtime = createWizardRuntime();
			const element = document.createElement('div');
			const host = document.createElement('div');
			element.append(host);
			provideTestRuntime(element, runtime);
			const form = new FormController(host);
			const listener = vi.fn();
			const stop = form.wizard.subscribe(listener);
			const before = form.wizard.get();
			listener.mockClear();

			runtime.container.setValue('title', 'typed');
			runtime.clearSubmission();

			expect(form.wizard.get()).toBe(before);
			expect(listener).not.toHaveBeenCalled();
			stop();
		});

		test('follows the runtime the instance replaces', () => {
			const [first, second] = [createWizardRuntime(), createWizardRuntime()];
			const element = document.createElement('div');
			const host = document.createElement('div');
			element.append(host);
			const provider = provideTestRuntime(element, first);
			const form = new FormController(host);
			const listener = vi.fn();
			const stop = form.wizard.subscribe(listener);
			expect(form.wizard.get()?.next).toBe(first.next);
			listener.mockClear();

			provider.setContext({ ...provider.getContext(), runtime: second });

			expect(form.wizard.get()?.next).toBe(second.next);
			expect(listener).toHaveBeenCalledTimes(1);
			stop();
		});

		test('stops listening to the runtime once its last subscriber leaves', () => {
			const runtime = createWizardRuntime();
			const unsubscribeRuntime = vi.fn();
			const subscribe = runtime.subscribe;
			const subscribeSpy = vi.spyOn(runtime, 'subscribe').mockImplementation((listener) => {
				const stop = subscribe(listener);
				return () => {
					unsubscribeRuntime();
					stop();
				};
			});
			const element = document.createElement('div');
			const host = document.createElement('div');
			element.append(host);
			provideTestRuntime(element, runtime);
			const form = new FormController(host);

			const stopFirst = form.wizard.subscribe(() => {});
			const stopSecond = form.wizard.subscribe(() => {});
			expect(subscribeSpy).toHaveBeenCalled();

			stopFirst();
			expect(unsubscribeRuntime).not.toHaveBeenCalled();
			stopSecond();
			expect(unsubscribeRuntime).toHaveBeenCalledTimes(subscribeSpy.mock.calls.length);
		});
	});

	describe('submission', () => {
		test('reads the runtime submission, notifies when it changes, and clearSubmission hides its outcome', async () => {
			const { form, runtime } = createTestForm({}, [
				{
					$type: 'input',
					id: 'title',
					name: 'title',
					label: 'Title',
					rules: [{ $type: 'required', message: 'Required' }],
				},
			]);
			const listener = vi.fn();
			const stop = form.submission.subscribe(listener);
			expect(form.submission.get()).toEqual({ status: 'idle', failures: [], submitCount: 0 });
			listener.mockClear();

			await expect(runtime.submit()).resolves.toBe('invalid');
			expect(form.submission.get()?.submitCount).toBe(1);
			expect(listener).toHaveBeenCalled();
			const failed = form.submission.get();

			listener.mockClear();
			runtime.container.setValue('title', 'x');
			expect(form.submission.get()).toBe(failed);
			expect(listener).not.toHaveBeenCalled();

			form.clearSubmission();
			expect(form.submission.get()).toEqual({ status: 'idle', failures: [], submitCount: 1 });
			stop();
		});

		test('follows the runtime the instance replaces', async () => {
			const first = createTestForm();
			const second = createTestForm({}, [
				{
					$type: 'input',
					id: 'title',
					name: 'title',
					label: 'Title',
					rules: [{ $type: 'required', message: 'Required' }],
				},
			]);
			await second.runtime.submit();
			const element = document.createElement('div');
			const host = document.createElement('div');
			element.append(host);
			const provider = provideTestRuntime(element, first.runtime);
			const form = new FormController(host);
			const listener = vi.fn();
			const stop = form.submission.subscribe(listener);
			listener.mockClear();

			provider.setContext({ ...provider.getContext(), runtime: second.runtime });

			expect(form.submission.get()).toBe(second.runtime.getSnapshot().submission);
			expect(listener).toHaveBeenCalledTimes(1);
			stop();
		});
	});
});
