import { createRadiantFormComposer } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';

export { ValidationPresets };

function createStoryFormComposer() {
	return createRadiantFormComposer().addElements(schemaFormRegistrations);
}

export const storyFormEngine = createStoryFormComposer().build();

export function createForm() {
	return createStoryFormComposer().build().createFormDefinition();
}

export function getEngine() {
	return storyFormEngine;
}

export { radiantAdapter } from '@/adapters/radiant';
