import { DefaultStepper, type DefaultStepperConfig } from './default-stepper';
import { registerStepper } from '@/registries';

registerStepper({
	stepperId: 'default',
	name: 'Default Stepper',
	description: 'Standard stepper with horizontal or vertical layout',
	component: DefaultStepper,
	defaultConfig: {
		orientation: 'horizontal',
		variant: 'default',
		showStepNumbers: true,
		showStepTitles: true,
		allowStepJumping: false,
		primaryColor: '#3b82f6',
		completedColor: '#10b981',
	},
});

declare module '@json-form-engine/core/steppers/types' {
	interface StepperConfigRegistry {
		default: DefaultStepperConfig;
	}
}
