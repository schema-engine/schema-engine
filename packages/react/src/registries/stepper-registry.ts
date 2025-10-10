import type React from 'react';
import { StepperRegistry } from '@json-form-engine/core/steppers/stepper-registry';
import type { StepperRegistration } from '@json-form-engine/core/steppers/types';

/**
 * React-specific stepper registry instance
 */
export const reactStepperRegistry = new StepperRegistry<React.ComponentType<any>>();

/**
 * Convenience function for registering React stepper components
 */
export function registerStepper(registration: StepperRegistration<React.ComponentType<any>>): void {
	reactStepperRegistry.register(registration);
}

/**
 * Export registry for direct access if needed
 */
export { reactStepperRegistry as defaultStepperRegistry };
