import { DefaultStepperComposed } from './default-stepper';
import type { DefaultStepperConfig } from './default-stepper.types';
import { DefaultStepperConfigSchema } from './default-stepper.types';
import type { StepperRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(DefaultStepperConfigSchema),
	metadata: {
		name: 'Default Stepper',
		description: 'Multi-step form stepper with horizontal and sidebar layouts (shadcn)',
		icon: 'list',
	},
};
