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

export function defineStoryForm<const TConfig extends Parameters<typeof storyFormEngine.defineForm>[0]>(
	config: TConfig,
) {
	return storyFormEngine.defineForm(config);
}
