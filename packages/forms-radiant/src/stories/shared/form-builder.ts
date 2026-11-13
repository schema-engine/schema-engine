import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';

export { ValidationPresets };

export const storyFormEngine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
});

export function getEngine(): typeof storyFormEngine {
	return storyFormEngine;
}

export const defineStoryForm = storyFormEngine.defineForm.bind(storyFormEngine);
