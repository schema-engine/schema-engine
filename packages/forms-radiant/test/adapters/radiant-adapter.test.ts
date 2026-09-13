import { describe, expect, test, vi } from 'vitest';
import { FormController } from '@/adapters/radiant/controller';
import { createTestForm } from './test-form';
import { toFieldRules } from '@/lib/field-rules';

function registerInput(store: ReturnType<typeof createTestForm>['store'], name: string, initial: unknown = '') {
	let value = initial;
	const unregister = store.register({
		name,
		rules: toFieldRules([{ type: 'required', message: 'Required' }]),
		getValue: () => value,
		setValue: (next) => {
			value = next;
		},
	});
	return {
		get value() {
			return value;
		},
		set value(next) {
			value = next;
		},
		unregister,
	};
}

describe('FormController with Radiant UI store', () => {
	test('reads and writes the registered control and receives user changes', async () => {
		const { form, store } = createTestForm({ title: 'Initial' });
		const input = registerInput(store, 'title');
		const field = form.field('title');
		field.onChange('Programmatic');
		expect(input.value).toBe('Programmatic');
		input.value = 'Typed';
		await store.handleFieldChange('title');
		expect(field.value).toBe('Typed');
		expect(form.getValues()).toEqual({ title: 'Typed' });
	});

	test('uses Radiant UI validation and touched state', async () => {
		const { form, store } = createTestForm({ title: '' });
		registerInput(store, 'title');
		expect(await form.trigger()).toBe(false);
		expect(form.field('title').error).toBe('Required');
		form.field('title').onBlur();
		expect(store.touched.title).toBe(true);
		form.setValue('title', 'Valid');
		expect(await form.trigger('title')).toBe(true);
		expect(form.formState.isValid).toBe(true);
	});

	test('watch subscriptions receive initial and live values, with explicit and lifecycle cleanup', () => {
		const { form, store } = createTestForm({ title: 'Initial' });
		const fieldListener = vi.fn();
		const formListener = vi.fn();
		const stop = form.watchField('title', fieldListener);
		form.watchForm(formListener);
		expect(fieldListener).toHaveBeenLastCalledWith('Initial');
		store.setValue('title', 'Changed');
		expect(fieldListener).toHaveBeenLastCalledWith('Changed');
		stop();
		form.disconnect();
		store.setValue('title', 'After cleanup');
		expect(fieldListener).toHaveBeenCalledTimes(2);
		expect(formListener).toHaveBeenCalledTimes(2);
	});

	test('uses the nearest form and never selects an unrelated form', () => {
		const outer = createTestForm({ title: 'Outer' });
		const inner = createTestForm({ title: 'Inner' });
		outer.host.append(inner.element);
		expect(inner.form.getValue('title')).toBe('Inner');
		expect(outer.form.getValue('title')).toBe('Outer');
		expect(inner.form.store).toBe(inner.store);
		const detached = new FormController(document.createElement('div'));
		expect(detached.ready).toBe(false);
		expect(() => detached.getValues()).toThrow('connected rui-form');
	});

	test('reads formContext when the host is the rui-form provider', () => {
		const { element, store } = createTestForm({ title: 'Direct' });
		const form = new FormController(element);
		expect(form.getValue('title')).toBe('Direct');
		expect(form.store).toBe(store);
	});

	test('does not read a descendant form; the host must sit inside rui-form', () => {
		const nested = createTestForm({ title: 'Nested' });
		const wrapper = document.createElement('se-form-instance');
		wrapper.append(nested.element);
		const form = new FormController(wrapper);
		expect(form.ready).toBe(false);
	});

	test('ignores a private store field on the form host', () => {
		const host = document.createElement('div');
		const element = document.createElement('rui-form');
		Reflect.set(element, 'store', { getValues: () => ({ title: 'Secret' }) });
		element.append(host);
		const form = new FormController(host);
		expect(form.ready).toBe(false);
		expect(form.store).toBeUndefined();
	});

	test('moves live array values and metadata together and removes stale fields', async () => {
		const { form, store } = createTestForm({ users: [{ name: 'A' }, { name: 'B' }] });
		const first = registerInput(store, 'users.0.name');
		const second = registerInput(store, 'users.1.name');
		first.value = 'Typed A';
		await store.handleFieldChange('users.0.name');
		store.markTouched('users.0.name');
		store.errors = { 'users.0.name': { type: 'validation', message: 'A error' } };
		const array = form.fieldArray('users');
		const ids = array.fields;
		array.move(0, 1);
		expect(form.getValue('users')).toEqual([{ name: 'B' }, { name: 'Typed A' }]);
		expect(array.fields).toEqual([ids[1], ids[0]]);
		expect(store.touched['users.1.name']).toBe(true);
		expect(store.errors['users.1.name']?.message).toBe('A error');
		array.remove(1);
		second.unregister();
		expect(form.getValue('users')).toEqual([{ name: 'B' }]);
		expect(store.errors['users.1.name']).toBeUndefined();
	});
	test('controller watchers observe only complete array changes', () => {
		const { form, store } = createTestForm({ users: [{ name: 'A' }, { name: 'B' }] });
		registerInput(store, 'users.0.name');
		registerInput(store, 'users.1.name');
		const listener = vi.fn();
		form.watchField('users', listener);
		listener.mockClear();
		form.fieldArray('users').swap(0, 1);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenLastCalledWith([{ name: 'B' }, { name: 'A' }]);
	});

	test('clears dotted values without resurrecting defaults and resets the same controls', () => {
		const { form, store } = createTestForm({ user: { name: 'Ada' } });
		const input = registerInput(store, 'user.name');
		form.setValue('user.name', undefined);
		expect(form.getValue('user.name')).toBeUndefined();
		form.reset({ user: { name: 'Grace' } });
		expect(input.value).toBe('Grace');
		expect(form.getValues()).toEqual({ user: { name: 'Grace' } });
	});

	test('editing an unrelated array preserves existing row identity', () => {
		const { form } = createTestForm({ first: ['A'], second: ['B'] });
		const firstIds = form.fieldArray('first').fields;
		form.fieldArray('second').append('C');
		expect(form.fieldArray('first').fields).toEqual(firstIds);
	});
});
