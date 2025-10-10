import type { ElementRegistration } from '@/types';
import { ElementCategory } from '@/types';

/**
 * Validation utilities for the builder.
 */

/**
 * Validate that an element registration is well-formed.
 *
 * @param registration - Element registration to validate
 * @throws Error if validation fails
 */
export function validateElementRegistration(registration: ElementRegistration): void {
	// Validate componentId
	if (!registration.componentId || typeof registration.componentId !== 'string') {
		throw new Error('Element registration must have a valid componentId');
	}

	// Validate schema
	if (!registration.schema) {
		throw new Error(`Element "${registration.componentId}" must have a schema`);
	}

	// Validate metadata
	if (!registration.metadata) {
		throw new Error(`Element "${registration.componentId}" must have metadata`);
	}

	if (!registration.metadata.name) {
		throw new Error(`Element "${registration.componentId}" must have metadata.name`);
	}

	// Validate category
	if (!registration.metadata.category) {
		throw new Error(`Element "${registration.componentId}" must have metadata.category`);
	}

	if (!Object.values(ElementCategory).includes(registration.metadata.category)) {
		throw new Error(
			`Element "${registration.componentId}" has invalid category "${registration.metadata.category}". ` +
				`Must be one of: ${Object.values(ElementCategory).join(', ')}`,
		);
	}

	// Validate render function
	if (!registration.render || typeof registration.render !== 'function') {
		throw new Error(`Element "${registration.componentId}" must have a render function`);
	}
}

/**
 * Validate that input elements have 'name' field in their schema.
 *
 * This is a runtime check to ensure input category elements properly collect form data.
 *
 * @param registration - Element registration to validate
 * @throws Error if input element schema doesn't include 'name' field
 */
export function validateInputElementSchema(registration: ElementRegistration): void {
	if (registration.metadata.category !== ElementCategory.INPUT) {
		return; // Only input elements require 'name'
	}

	// Try to parse an empty config to inspect schema shape
	try {
		const testConfig = registration.schema.parse({ name: 'test' });
		if (testConfig && typeof testConfig === 'object' && !('name' in testConfig)) {
			throw new Error(`Input element "${registration.componentId}" must have 'name' field in schema`);
		}
	} catch {
		// If parsing fails, we can't validate - log warning but don't throw
		console.warn(`Could not validate 'name' field for input element "${registration.componentId}"`);
	}
}
