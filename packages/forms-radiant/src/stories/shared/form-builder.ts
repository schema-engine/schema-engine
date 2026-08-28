import { createRadiantFormComposer } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import {
	CardLayoutRegistration,
	SplitScreenLayoutRegistration,
	HeroBackgroundLayoutRegistration,
} from '@/components/layouts';
import { DefaultStepperRegistration, MinimalistStepperRegistration } from '@/components/steppers';
import { ValidationPresets } from '@schema-engine/forms/schemas/validation';

export { ValidationPresets };

function createStoryFormComposer() {
	return createRadiantFormComposer()
		.addElements(schemaFormRegistrations)
		.addLayout(CardLayoutRegistration)
		.addLayout(SplitScreenLayoutRegistration)
		.addLayout(HeroBackgroundLayoutRegistration)
		.addStepper(DefaultStepperRegistration)
		.addStepper(MinimalistStepperRegistration);
}

export const storyFormEngine = createStoryFormComposer().build();

export function createForm() {
	return createStoryFormComposer().build().createFormDefinition();
}

export function getEngine() {
	return storyFormEngine;
}

export { radiantAdapter } from '@/adapters/radiant';
