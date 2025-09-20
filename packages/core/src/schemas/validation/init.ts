import type { ValidationRegistration } from './validation-registry.js';
import { validationRegistry } from './validation-registry.js';

let initialized = false;
const customValidations: ValidationRegistration[] = [];

/**
 * Add custom validation to be registered during initialization
 */
export function addCustomValidation(registration: ValidationRegistration): void {
	customValidations.push(registration);
}

/**
 * Add multiple custom validations
 */
export function addCustomValidations(registrations: ValidationRegistration[]): void {
	customValidations.push(...registrations);
}

/**
 * Initialize the validation system with any queued custom validations
 * This is optional - the system works without explicit initialization
 */
export function initializeValidation(additionalValidations?: ValidationRegistration[]): void {
	if (initialized) {
		console.warn('Validation system already initialized');
		return;
	}

	// Add any additional validations provided directly
	if (additionalValidations) {
		customValidations.push(...additionalValidations);
	}

	// Register any queued custom validations
	if (customValidations.length > 0) {
		validationRegistry.registerMultiple(customValidations);
		console.log(`Initialized validation system with ${customValidations.length} custom validations`);
	}

	initialized = true;
}

/**
 * Check if the validation system has been explicitly initialized
 */
export function isValidationInitialized(): boolean {
	return initialized;
}

/**
 * Get validation system statistics
 */
export function getValidationStats() {
	return {
		initialized,
		customValidationsQueued: customValidations.length,
		totalRegistered: validationRegistry.getRegisteredTypes().length,
	};
}

/**
 * Reset validation initialization state (mainly for testing)
 */
export function resetValidationInit(): void {
	initialized = false;
	customValidations.length = 0; // Clear array efficiently
	validationRegistry.clear();
	// Re-register built-ins since we cleared everything
	(validationRegistry as any).registerBuiltInValidations();
}
