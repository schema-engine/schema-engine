import { MinimalistStepperComposed } from './minimalist-stepper';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';
import { MinimalistStepperConfigSchema } from './minimalist-stepper.types';
import type { StepperRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(MinimalistStepperConfigSchema),
	metadata: {
		name: 'Minimalist Stepper',
		description: 'Clean minimalist stepper with progress bar and simple navigation (shadcn)',
		icon: 'minus',
	},
};
