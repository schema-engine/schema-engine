import { registerStepper } from '@/registries/stepper-registry';
import { MinimalistStepper } from './minimalist-stepper';
import type { MinimalistStepperConfig } from './minimalist-stepper';

registerStepper({
	stepperId: 'minimalist',
	name: 'Minimalist Stepper',
	description: 'Simple text-based navigation',
	component: MinimalistStepper,
	defaultConfig: {
		showProgress: true,
		primaryColor: '#3b82f6',
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		minimalist: MinimalistStepperConfig;
	}
}
