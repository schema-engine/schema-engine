import { registerStepper } from '@/registries/stepper-registry';
import { DefaultStepperComposed } from './default-stepper';
import type { DefaultStepperConfig } from './default-stepper';

registerStepper({
	stepperId: 'default',
	name: 'Default Stepper',
	description: 'Default horizontal stepper with step indicators and connecting lines',
	component: DefaultStepperComposed,
	defaultConfig: {
		showStepNumbers: true,
		showStepTitles: true,
		showStepDescriptions: false,
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		default: DefaultStepperConfig;
	}
}
