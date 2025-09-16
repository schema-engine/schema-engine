import React from 'react';
import { FormFieldComponentRegistry } from '@json-form-engine/core/schemas/registry';

/**
 * React-specific form field registry instance
 * This is the default registry that React components should use
 */
export const reactFormFieldRegistry = new FormFieldComponentRegistry<React.ComponentType<any>>();

/**
 * Convenience function for registering React field types
 * This provides a clean API for registering field components in React applications
 */
export function registerFieldType(registration: FormEngine.FieldRegistration<React.ComponentType<any>>): void {
	reactFormFieldRegistry.register(registration);
}

/**
 * Export the registry for direct access if needed
 * Most users should use registerFieldType() instead
 */
export { reactFormFieldRegistry as defaultFormFieldRegistry };
