import { registerStepper } from '@/registries/stepper-registry';
import { VerticalStepsStepper } from './vertical-stepper';
import type { VerticalStepsStepperConfig } from './vertical-stepper';

registerStepper({
	stepperId: 'vertical',
	name: 'Vertical Steps Stepper',
	description: 'Show steps as a vertical timeline',
	component: VerticalStepsStepper,
	defaultConfig: {
		showConnectors: true,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
		backgroundColor: '#e5e7eb',
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		vertical: VerticalStepsStepperConfig;
	}
}
