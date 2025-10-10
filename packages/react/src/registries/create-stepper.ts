import type { StepperRegistration } from '@json-form-engine/core/steppers/types';
import { registerStepper } from '@/registries/stepper-registry';

/**
 * Simple stepper registration helper
 * This provides a convenient way to register steppers with automatic registration
 *
 * @example
 * ```typescript
 * const myStepper = createStepperRegistration({
 *   stepperId: 'my-stepper',
 *   name: 'My Custom Stepper',
 *   component: MyStepperComponent,
 *   defaultConfig: { showLabels: true }
 * });
 * ```
 */
export function createStepperRegistration(
	registration: StepperRegistration<React.ComponentType<any>>,
): StepperRegistration<React.ComponentType<any>> {
	// Register the stepper
	registerStepper(registration);

	return registration;
}
