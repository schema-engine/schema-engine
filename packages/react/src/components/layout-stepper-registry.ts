import type React from 'react';
import { LayoutRegistry } from '@json-form-engine/core/layouts/layout-registry';
import { StepperRegistry } from '@json-form-engine/core/steppers/stepper-registry';
import type { LayoutRegistration } from '@json-form-engine/core/layouts/types';
import type { StepperRegistration } from '@json-form-engine/core/steppers/types';

/**
 * React-specific layout registry instance
 */
export const reactLayoutRegistry = new LayoutRegistry<React.ComponentType<any>>();

/**
 * React-specific stepper registry instance
 */
export const reactStepperRegistry = new StepperRegistry<React.ComponentType<any>>();

/**
 * Convenience function for registering React layout components
 */
export function registerLayout(registration: LayoutRegistration<React.ComponentType<any>>): void {
	reactLayoutRegistry.register(registration);
}

/**
 * Convenience function for registering React stepper components
 */
export function registerStepper(registration: StepperRegistration<React.ComponentType<any>>): void {
	reactStepperRegistry.register(registration);
}

/**
 * Export registries for direct access if needed
 */
export { reactLayoutRegistry as defaultLayoutRegistry };
export { reactStepperRegistry as defaultStepperRegistry };
