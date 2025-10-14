/**
 * Debugger Stepper Registration with Type Augmentation
 */

import { DebuggerStepperRegistration } from './debugger-stepper';
import type { DebuggerStepperConfig } from './debugger-stepper.types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			debugger: DebuggerStepperConfig;
		}
	}
}

export const DebuggerStepperRegistrationWithTypes = DebuggerStepperRegistration;
export { DebuggerStepperRegistration };
