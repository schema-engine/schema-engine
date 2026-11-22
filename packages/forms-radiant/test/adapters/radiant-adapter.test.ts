import { describe, expect, test, vi } from 'vitest';
import { selectFieldState } from '@schema-engine/forms/state-container';
import { FormController } from '@/adapters/radiant/controller';
import { createTestForm, provideTestContainer } from './test-form';

const required = [{ $type: 'input', id: 'title', name: 'title', rules: [{ type: 'required', message: 'Required' }] }];

describe('FormController over the form instance container', () => {
	test('reads and writes nested values through the container', () => {
		const { form, container } = createTestForm({ title: 'Initial', user: { name: 'Ada' } });
		expect(form.getValues()).toEqual({ title: 'Initial', user: { name: 'Ada' } });
		form.field('user.name').onChange('Grace');
		expect(container.getValue('user.name')).toBe('Grace');
		expect(form.field('user.name').value).toBe('Grace');
		form.setValue('user.name', undefined);
		expect(form.getValue('user.name')).toBeUndefined();
		expect(form.getValues()).toBe(container.getSnapshot().values);
	});

	test('validates with the engine rules and keeps touched state in the container', async () => {
		const { form, container } = createTestForm({ title: '' }, required);
		expect(await form.trigger()).toBe(false);
		expect(form.field('title').error).toBe('Required');
		form.field('title').onBlur();
		expect(selectFieldState(container.getSnapshot(), 'title').isTouched).toBe(true);
		form.setValue('title', 'Valid');
		expect(await form.trigger('title')).toBe(true);
		expect(form.formState.isValid).toBe(true);
	});

	test('shows an issue through the formatter the application gave, else its message, never its type', async () => {
		const withFormatter = createTestForm({ title: '' }, required, (issue, { path }) => `${path}:${issue.type}`);
		await withFormatter.form.trigger();
		expect(withFormatter.form.field('title').error).toBe('title:required');

		const bare = createTestForm({ title: '' }, [
			{ $type: 'input', id: 'title', name: 'title', rules: [{ type: 'minLength', value: 3 }] },
		]);
		bare.form.setValue('title', 'ab');
		await bare.form.trigger();
		expect(bare.container.getSnapshot().errors.title?.type).toBe('minLength');
		expect(bare.form.field('title').error).toBeUndefined();
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

	test('connect reports each change of the container until it disconnects', () => {
		const { form, container } = createTestForm({ title: 'a' });
		const onChange = vi.fn();
		form.connect(onChange);
		expect(onChange).toHaveBeenCalledTimes(1);
		container.setValue('title', 'b');
		expect(onChange).toHaveBeenCalledTimes(2);
		form.disconnect();
		container.setValue('title', 'c');
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	test('uses the nearest form and never selects an unrelated form', () => {
		const outer = createTestForm({ title: 'Outer' });
		const inner = createTestForm({ title: 'Inner' });
		outer.host.append(inner.element);
		expect(inner.form.getValue('title')).toBe('Inner');
		expect(outer.form.getValue('title')).toBe('Outer');
		expect(inner.form.container).toBe(inner.container);
		const detached = new FormController(document.createElement('div'));
		expect(detached.ready).toBe(false);
		expect(() => detached.getValues()).toThrow('connected se-form-instance');
	});

	test('reads the context when the host is the provider', () => {
		const { element, container } = createTestForm({ title: 'Direct' });
		const form = new FormController(element);
		expect(form.getValue('title')).toBe('Direct');
		expect(form.container).toBe(container);
	});

	test('does not read a descendant form; the host must sit inside the instance', () => {
		const nested = createTestForm({ title: 'Nested' });
		const wrapper = document.createElement('div');
		wrapper.append(nested.element);
		expect(new FormController(wrapper).ready).toBe(false);
	});

	test('follows a container the instance replaces', () => {
		const first = createTestForm({ title: 'First' });
		const second = createTestForm({ title: 'Second' });
		const element = document.createElement('div');
		const host = document.createElement('div');
		element.append(host);
		const provider = provideTestContainer(element, first.container);
		const form = new FormController(host);
		const onChange = vi.fn();
		form.connect(onChange);
		expect(form.getValue('title')).toBe('First');
		provider.setContext({ ...provider.getContext(), container: second.container });
		expect(form.getValue('title')).toBe('Second');
		const afterSwap = onChange.mock.calls.length;
		second.container.setValue('title', 'Changed');
		expect(onChange.mock.calls.length).toBe(afterSwap + 1);
		first.container.setValue('title', 'Ignored');
		expect(onChange.mock.calls.length).toBe(afterSwap + 1);
		form.disconnect();
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

	test('a field binding and a selection follow the container the instance replaces', () => {
		const first = createTestForm({ title: 'First' });
		const second = createTestForm({ title: 'Second' });
		const element = document.createElement('div');
		const host = document.createElement('div');
		element.append(host);
		const provider = provideTestContainer(element, first.container);
		const form = new FormController(host);
		const field = form.field('title');
		const title = form.select((snapshot) => snapshot.values['title']);
		const listener = vi.fn();
		const stop = title.subscribe(listener);
		expect(field.value).toBe('First');
		listener.mockClear();

		provider.setContext({ ...provider.getContext(), container: second.container });

		expect(field.value).toBe('Second');
		field.onChange('Edited');
		expect(second.container.getValue('title')).toBe('Edited');
		expect(first.container.getValue('title')).toBe('First');
		expect(title.get()).toBe('Edited');
		expect(listener).toHaveBeenCalled();
		stop();
	});

	test('moves row values and field state together and keeps row identity through a move', async () => {
		const { form, container } = createTestForm(
			{
				users: [
					{ name: 'A', role: 'x' },
					{ name: 'B', role: 'y' },
				],
			},
			[
				{
					$type: 'arrayElements',
					id: 'users',
					name: 'users',
					elements: [
						{ $type: 'input', id: 'name', name: 'name', rules: [{ type: 'required', message: 'Name' }] },
						{ $type: 'input', id: 'role', name: 'role' },
					],
				},
			],
		);
		container.setValue('users.0.name', '');
		container.blur('users.0.name');
		await form.trigger();
		const array = form.fieldArray('users');
		const [first, second] = array.fields;
		array.move(0, 1);
		expect(form.getValue('users')).toEqual([
			{ name: 'B', role: 'y' },
			{ name: '', role: 'x' },
		]);
		expect(form.fieldArray('users').fields).toEqual([second, first]);
		const snapshot = form.formState;
		expect(snapshot.errors['users.1.name']?.message).toBe('Name');
		expect(snapshot.errors['users.0.name']).toBeUndefined();
		expect(selectFieldState(snapshot, 'users.1.name').isTouched).toBe(true);
		form.fieldArray('users').remove(1);
		expect(form.formState.errors['users.1.name']).toBeUndefined();
	});

	test('editing an unrelated array preserves existing row identity', () => {
		const { form } = createTestForm({ first: ['A'], second: ['B'] });
		const firstIds = form.fieldArray('first').fields;
		form.fieldArray('second').append('C');
		expect(form.fieldArray('first').fields).toEqual(firstIds);
	});

	test('resets to the defaults, or to new ones', () => {
		const { form } = createTestForm({ user: { name: 'Ada' } });
		form.setValue('user.name', 'Grace');
		form.reset();
		expect(form.getValues()).toEqual({ user: { name: 'Ada' } });
		form.reset({ user: { name: 'Hedy' } });
		expect(form.getValues()).toEqual({ user: { name: 'Hedy' } });
	});
});
