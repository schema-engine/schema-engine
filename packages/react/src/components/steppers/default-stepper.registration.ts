import { DefaultStepperComposed } from './default-stepper';
import type { DefaultStepperConfig } from './default-stepper.types';
import { DefaultStepperConfigSchema } from './default-stepper.types';
import type { StepperRegistration } from '@json-form-engine/core/types';

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
	{ children?: React.ReactNode }
> = {
	$type: 'default',
	render: DefaultStepperComposed,
	schema: DefaultStepperConfigSchema,
	metadata: {
		name: 'Default Stepper',
		description: 'Default multi-step form stepper with horizontal and sidebar layouts',
		icon: 'list',
	},
};
