import { DebuggerStepperComposed } from './debugger-stepper';
import type { DebuggerStepperConfig } from './debugger-stepper.types';
import { DebuggerStepperConfigSchema } from './debugger-stepper.types';
import type { StepperRegistration } from '@json-form-engine/core/types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			debugger: DebuggerStepperConfig;
		}
	}
}

export const DebuggerStepperRegistration: StepperRegistration<
	'debugger',
	DebuggerStepperConfig,
	{ children?: React.ReactNode }
> = {
	$type: 'debugger',
	render: DebuggerStepperComposed,
	schema: DebuggerStepperConfigSchema,
	metadata: {
		name: 'Debugger Stepper',
		description: 'Modern dev tool widget with FAB button for debugging multi-step forms',
		icon: 'bug',
	},
};
