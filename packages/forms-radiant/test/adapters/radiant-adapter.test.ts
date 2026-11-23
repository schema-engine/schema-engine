import { describe, expect, test, vi } from 'vitest';
import { createFormRuntime } from '@schema-engine/forms';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { FormController } from '@/adapters/radiant/controller';
import { createTestForm, provideTestContainer } from './test-form';

describe('FormController over the form instance container', () => {
	test('hands over the runtime of the form now, and each runtime the instance replaces it with', () => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const config = engine.validateForm({ id: 'test', steps: [{ id: 'main', title: 'Main', elements: [] }] });
		const make = () => createFormRuntime({ engine, config, host: { focus: () => {} } });
		const [first, second] = [make(), make()];
		const element = document.createElement('div');
		const host = document.createElement('div');
		element.append(host);
		const provider = provideTestContainer(element, first.container, undefined, first);
		const seen: Array<unknown> = [];

		const stop = new FormController(host).watchRuntime((runtime) => seen.push(runtime));
		expect(seen).toEqual([first]);

		provider.setContext({ ...provider.getContext(), runtime: first });
		expect(seen).toEqual([first]);
		provider.setContext({ ...provider.getContext(), container: second.container, runtime: second });
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
		const provider = provideTestContainer(element, undefined);
		const form = new FormController(host);
		const title = form.select((snapshot) => snapshot.values['title']);
		const listener = vi.fn();

		expect(title.get()).toBeUndefined();
		const stop = title.subscribe(listener);
		expect(title.get()).toBeUndefined();
		const { container } = createTestForm({ title: 'Arrived' });
		provider.setContext({ ...provider.getContext(), container });

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
		const provider = provideTestContainer(element, first.container);
		const form = new FormController(host);
		const title = form.select((snapshot) => snapshot.values['title']);
		const listener = vi.fn();
		const stop = title.subscribe(listener);
		expect(title.get()).toBe('First');
		listener.mockClear();

		provider.setContext({ ...provider.getContext(), container: second.container });

		expect(form.container).toBe(second.container);
		expect(title.get()).toBe('Second');
		second.container.setValue('title', 'Edited');
		expect(title.get()).toBe('Edited');
		first.container.setValue('title', 'Ignored');
		expect(title.get()).toBe('Edited');
		expect(listener).toHaveBeenCalled();
		stop();
	});
});
