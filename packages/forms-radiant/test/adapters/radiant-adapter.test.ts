import { describe, expect, beforeEach, afterEach, test } from 'vitest';
import { FormStore } from '@/adapters/store/form-store';
import { setActiveFormStore } from '@/adapters/store/active-store';
import { useWatchForm, useWatchField, useFormContext, useFormField, useFieldArray } from '@/adapters/radiant/hooks';
import type { FormConfig } from '@schema-engine/forms/schemas';

const sampleConfig: FormConfig = {
	id: 'adapter-test-form',
	steps: [
		{
			id: 'step-1',
			elements: [
				{
					$type: 'input',
					id: 'title',
					name: 'title',
					label: 'Title',
					rules: [{ type: 'required', message: 'Title is required' }],
				},
				{
					$type: 'input',
					id: 'author',
					name: 'author',
					label: 'Author',
				},
			],
		},
	],
};

describe('radiant adapter hooks', () => {
	let store: FormStore;

	beforeEach(() => {
		store = new FormStore(sampleConfig, { title: 'Initial Title', author: 'Jane' });
		setActiveFormStore(store);
	});

	afterEach(() => {
		setActiveFormStore(null);
	});

	test('useWatchForm returns current snapshot of all values', () => {
		const values = useWatchForm();
		expect(values).toEqual({ title: 'Initial Title', author: 'Jane' });

		store.setValue('title', 'Updated Title');
		expect(useWatchForm()).toEqual({ title: 'Updated Title', author: 'Jane' });

		interface CustomForm {
			title: string;
			author: string;
			extra?: string;
		}
		const custom = useWatchForm<CustomForm>({ extra: 'default-extra', title: '', author: '' });
		expect(custom.extra).toBe('default-extra');
		expect(custom.title).toBe('Updated Title');
	});

	test('useWatchField returns single field value and multiple field values', () => {
		expect(useWatchField('title')).toBe('Initial Title');
		expect(useWatchField(['title', 'author'])).toEqual(['Initial Title', 'Jane']);

		store.setValue('title', 'New Title');
		expect(useWatchField('title')).toBe('New Title');
		expect(useWatchField(['title', 'author'])).toEqual(['New Title', 'Jane']);

		const typedTitle: string = useWatchField<string>('title');
		expect(typedTitle).toBe('New Title');

		const fallback = useWatchField('missingField', 'Default Value');
		expect(fallback).toBe('Default Value');

		const [t, a] = useWatchField<[string, string]>(['title', 'author']);
		expect(t).toBe('New Title');
		expect(a).toBe('Jane');
	});

	test('applies watch defaults per missing field and preserves explicit values', () => {
		store.setValue('author', null);
		expect(useWatchField(['title', 'missing', 'author'], ['fallback', 'default', 'author fallback'])).toEqual([
			'Initial Title',
			'default',
			null,
		]);
		expect(useWatchField(['missing', 'another'], ['first', 'second'])).toEqual(['first', 'second']);
		expect(useWatchField(['title', 'missing'])).toEqual(['Initial Title', undefined]);
	});

	test('useFormContext returns form context operations and state', async () => {
		const ctx = useFormContext();
		expect(ctx.getValues()).toEqual({ title: 'Initial Title', author: 'Jane' });

		ctx.setValue('title', 'Changed by context');
		expect(store.getValue('title')).toBe('Changed by context');

		const isValid = await ctx.trigger();
		expect(isValid).toBe(true);
	});

	test('useFormField returns controlled binding for element', () => {
		const field = useFormField({
			$type: 'input',
			id: 'title',
			name: 'title',
			label: 'Title',
			rules: [{ type: 'required', message: 'Required' }],
		});

		expect(field.name).toBe('title');
		expect(field.value).toBe('Initial Title');
		expect(field.required).toBe(true);

		field.onChange('Typed Title');
		expect(store.getValue('title')).toBe('Typed Title');

		field.onBlur();
		expect(store.touched.get().title).toBe(true);
	});

	test('useFieldArray returns array manipulation interface', () => {
		const arrayHelper = useFieldArray('tags');
		expect(arrayHelper.fields).toEqual([]);

		arrayHelper.append('schema');
		expect(store.getValue('tags')).toEqual(['schema']);
	});

	test('throws descriptive error when no active store is registered', () => {
		setActiveFormStore(null);
		expect(() => useWatchForm()).toThrow('No active FormStore. Use FormProvider to wrap form fields.');
		expect(() => useFormContext()).toThrow('No active FormStore. Use FormProvider to wrap form fields.');
		expect(() => useWatchField('title')).toThrow('No active FormStore. Use FormProvider to wrap form fields.');
		expect(() => useFieldArray('tags')).toThrow('No active FormStore. Use FormProvider to wrap form fields.');
	});
});
