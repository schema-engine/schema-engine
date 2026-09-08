import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormAdapter } from '@/adapters/types';

export function isLiveFormEngine(engine: unknown): engine is FormEngine {
	return (
		typeof engine === 'object' &&
		engine !== null &&
		typeof (engine as FormEngine).getRecipe === 'function' &&
		typeof (engine as FormEngine).validateForm === 'function' &&
		typeof (engine as FormEngine).getElement === 'function'
	);
}

export function isLiveFormAdapter(adapter: unknown): adapter is FormAdapter {
	return (
		typeof adapter === 'object' &&
		adapter !== null &&
		typeof (adapter as FormAdapter).useFormContext === 'function' &&
		typeof (adapter as FormAdapter).FormProvider === 'function'
	);
}

export function resolveStoryEngine(engine: unknown, fallback: FormEngine): FormEngine {
	if (engine == null) return fallback;
	if (isLiveFormEngine(engine)) return engine;
	throw new Error(
		'Form story engine must be a live FormEngine (getRecipe, validateForm, getElement). Pass it from story render setup, not serialized Storybook args.',
	);
}

export function resolveStoryAdapter(adapter: unknown, fallback: FormAdapter): FormAdapter {
	if (adapter == null) return fallback;
	if (isLiveFormAdapter(adapter)) return adapter;
	throw new Error(
		'Form story adapter must be a live FormAdapter (useFormContext, FormProvider). Pass it from story render setup, not serialized Storybook args.',
	);
}
