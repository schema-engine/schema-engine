/**
 * Vertical Stepper Registration with Type Augmentation
 */

import { VerticalStepperRegistration } from './vertical-stepper';
import type { VerticalStepsStepperConfig } from './vertical-stepper.types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			vertical: VerticalStepsStepperConfig;
		}
	}
}

export const VerticalStepperRegistrationWithTypes = VerticalStepperRegistration;
export { VerticalStepperRegistration };
