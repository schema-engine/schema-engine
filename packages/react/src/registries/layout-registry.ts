import type React from 'react';
import { LayoutRegistry } from '@json-form-engine/core/layouts/layout-registry';
import type { LayoutRegistration } from '@json-form-engine/core/layouts/types';

/**
 * React-specific layout registry instance
 */
export const reactLayoutRegistry = new LayoutRegistry<React.ComponentType<any>>();

/**
 * Convenience function for registering React layout components
 */
export function registerLayout(registration: LayoutRegistration<React.ComponentType<any>>): void {
	reactLayoutRegistry.register(registration);
}

/**
 * Export registry for direct access if needed
 */
export { reactLayoutRegistry as defaultLayoutRegistry };
