/**
 * Default Stepper Registration with Type Augmentation
 */

import { DefaultStepperRegistration } from './default-stepper';
import type { DefaultStepperConfig } from './default-stepper.types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			default: DefaultStepperConfig;
		}
	}
}

export const DefaultStepperRegistrationWithTypes = DefaultStepperRegistration;
export { DefaultStepperRegistration };
