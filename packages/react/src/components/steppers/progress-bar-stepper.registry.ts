import { registerStepper } from '@/registries/stepper-registry';
import { ProgressBarStepper } from './progress-bar-stepper';
import type { ProgressBarStepperConfig } from './progress-bar-stepper';

registerStepper({
	stepperId: 'progress-bar',
	name: 'Progress Bar Stepper',
	description: 'Show progress as a horizontal progress bar with step indicators',
	component: ProgressBarStepper,
	defaultConfig: {
		showStepNumbers: true,
		showStepTitles: true,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
		backgroundColor: '#e5e7eb',
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		'progress-bar': ProgressBarStepperConfig;
	}
}
