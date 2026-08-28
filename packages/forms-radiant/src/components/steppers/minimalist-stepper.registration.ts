import { MinimalistStepperComposed } from './minimalist-stepper';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';
import { MinimalistStepperConfigSchema } from './minimalist-stepper.types';
import type { StepperRegistration } from '@schema-engine/forms/types';
import type { JsxRenderable } from '@ecopages/jsx';

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
	{ children?: JsxRenderable }
> = {
	$type: 'minimalist',
	render: MinimalistStepperComposed,
	schema: MinimalistStepperConfigSchema,
	metadata: {
		name: 'Minimalist Stepper',
		description: 'Compact stepper with progress bar',
		icon: 'minus',
	},
};
