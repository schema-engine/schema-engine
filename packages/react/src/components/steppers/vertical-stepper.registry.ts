import { registerStepper } from '@/registries/stepper-registry';
import type { VerticalStepsStepperConfig } from './vertical-stepper';
import { VerticalStepsStepperComposed } from './vertical-stepper';

registerStepper({
	stepperId: 'vertical',
	name: 'Vertical Steps Stepper',
	description: 'Show steps as a vertical timeline',
	component: VerticalStepsStepperComposed,
	defaultConfig: {
		__stepperId: 'vertical',
		showConnectors: true,
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		vertical: VerticalStepsStepperConfig;
	}
}
