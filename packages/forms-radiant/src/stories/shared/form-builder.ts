import { createRadiantFormComposer } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';

export { ValidationPresets };

function createStoryFormComposer() {
	return createRadiantFormComposer().addElements(schemaFormRegistrations);
}

export const storyFormEngine = createStoryFormComposer().build();

export function getEngine() {
	return storyFormEngine;
}

export function defineStoryForm<const TConfig extends Parameters<typeof storyFormEngine.defineForm>[0]>(
	config: TConfig,
) {
	return storyFormEngine.defineForm(config);
}

export { radiantAdapter } from '@/adapters/radiant';
