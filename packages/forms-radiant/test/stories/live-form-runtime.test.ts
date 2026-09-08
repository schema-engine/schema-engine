import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { resolveStoryAdapter, resolveStoryEngine } from '@/stories/shared/live-form-runtime';
import type { FormAdapter } from '@/adapters/types';

const fallbackEngine = createFormEngine();
const fallbackAdapter = {
	useFormContext: () => ({
		getValues: () => ({}),
		setValue: () => undefined,
		trigger: async () => true,
		setFocus: () => undefined,
		formState: {
			errors: {},
			isValid: true,
			isSubmitting: false,
			touchedFields: {},
			submitCount: 0,
		},
	}),
	useFormField: () => ({
		value: undefined,
		onChange: () => undefined,
		onBlur: () => undefined,
		name: 'field',
		required: false,
	}),
	useWatchField: () => undefined,
	useWatchForm: () => ({}),
	useFieldArray: () => ({ fields: [], append: () => undefined, remove: () => undefined }),
	FormProvider: () => null,
} as FormAdapter;

describe('story live runtime contract', () => {
	test('falls back to the default engine when none is supplied', () => {
		expect(resolveStoryEngine(undefined, fallbackEngine)).toBe(fallbackEngine);
		expect(resolveStoryAdapter(undefined, fallbackAdapter)).toBe(fallbackAdapter);
	});

	test('keeps an explicit live engine', () => {
		const custom = createFormEngine();
		expect(resolveStoryEngine(custom, fallbackEngine)).toBe(custom);
	});

	test('throws when an explicit engine is not a live FormEngine', () => {
		expect(() => resolveStoryEngine({}, fallbackEngine)).toThrow(/live FormEngine/i);
		expect(() => resolveStoryEngine({ getRecipe: () => undefined }, fallbackEngine)).toThrow(/live FormEngine/i);
	});

	test('throws when an explicit adapter is not live', () => {
		expect(() => resolveStoryAdapter({}, fallbackAdapter)).toThrow(/live FormAdapter/i);
	});
});
