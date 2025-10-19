import { MinimalistStepperComposed } from './minimalist-stepper';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';
import { MinimalistStepperConfigSchema } from './minimalist-stepper.types';
import type { StepperRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			minimalist: MinimalistStepperConfig;
		}
	}
}

export const MinimalistStepperRegistration: StepperRegistration<
	'minimalist',
	MinimalistStepperConfig,
	{ children?: React.ReactNode }
> = {
	$type: 'minimalist',
	render: MinimalistStepperComposed,
	schema: MinimalistStepperConfigSchema,
	metadata: {
		name: 'Minimalist Stepper',
		description: 'Clean minimalist stepper with progress bar and simple navigation',
		icon: 'minimize',
	},
};
