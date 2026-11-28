import { createRadiantFormEngine } from '@/registries/builder-registry.js';
import { schemaFormRegistrations } from '@/registrations/index.js';
import { ValidationPresets } from '@schema-engine/forms';

export { ValidationPresets };

export const storyFormEngine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
});

export function getEngine(): typeof storyFormEngine {
	return storyFormEngine;
}

export const defineStoryForm = storyFormEngine.defineForm.bind(storyFormEngine);
