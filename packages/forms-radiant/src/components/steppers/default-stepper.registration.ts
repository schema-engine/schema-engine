import { DefaultStepperComposed } from './default-stepper';
import type { DefaultStepperConfig } from './default-stepper.types';
import { DefaultStepperConfigSchema } from './default-stepper.types';
import type { StepperRegistration } from '@schema-engine/forms/types';
import type { JsxRenderable } from '@ecopages/jsx';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			default: DefaultStepperConfig;
		}
	}
}

export const DefaultStepperRegistration: StepperRegistration<
	'default',
	DefaultStepperConfig,
	{ children?: JsxRenderable }
> = {
	$type: 'default',
	render: DefaultStepperComposed,
	schema: DefaultStepperConfigSchema,
	metadata: {
		name: 'Default Stepper',
		description: 'Multi-step form stepper with horizontal and sidebar layouts',
		icon: 'list',
	},
};
