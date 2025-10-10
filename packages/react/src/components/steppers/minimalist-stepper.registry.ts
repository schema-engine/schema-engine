import { registerStepper } from '@/registries/stepper-registry';
import { MinimalistStepperComposed } from './minimalist-stepper';
import type { MinimalistStepperConfig } from './minimalist-stepper';

registerStepper({
	stepperId: 'minimalist',
	name: 'Minimalist Stepper',
	description: 'Simple text-based navigation with compound pattern support',
	component: MinimalistStepperComposed,
	defaultConfig: {
		showProgress: true,
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		minimalist: MinimalistStepperConfig;
	}
}
