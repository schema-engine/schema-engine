/**
 * Centralized form registry setup
 * This ensures all registrations happen immediately when imported
 */

// Import all core registrations (fields, layouts, steppers)
import '@json-form-engine/react/registrations';

// Import layout and stepper registries for access
import { reactLayoutRegistry } from '@json-form-engine/react/registries/layout-registry';
import { reactStepperRegistry } from '@json-form-engine/react/registries/stepper-registry';

// Export a simple flag to confirm setup is complete
export const FORM_REGISTRY_INITIALIZED = true;

// Debug logging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
	console.log('=== FORM REGISTRY SETUP ===');
	console.log('Available steppers:', reactStepperRegistry.getRegisteredStepperIds());
	console.log('Available layouts:', reactLayoutRegistry.getRegisteredLayoutIds());
}
