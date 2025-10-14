/**
 * Minimalist Stepper Registration with Type Augmentation
 */

import { MinimalistStepperRegistration } from './minimalist-stepper';
import type { MinimalistStepperConfig } from './minimalist-stepper.types';

declare global {
	namespace FormEngine {
		interface StepperRegistry {
			minimalist: MinimalistStepperConfig;
		}
	}
}

export const MinimalistStepperRegistrationWithTypes = MinimalistStepperRegistration;
export { MinimalistStepperRegistration };
