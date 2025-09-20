import type { z } from 'zod';
import type { ValidationRule, AsyncRule } from './types.js';
import { defaultValidations } from './defaults.js';

/**
 * Validation rule registration definition
 */
export interface ValidationRegistration {
	type: string;
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic';
	handler: (rule: ValidationRule) => z.ZodTypeAny;
}

/**
 * Registry for validation rules
 * Provides registration, validation, and execution capabilities for validation types.
 */
export class ValidationRegistry {
	private validations = new Map<string, ValidationRegistration>();

	constructor() {
		this.registerBuiltInValidations();
	}

	/**
	 * Register a new validation type
	 */
	register(registration: ValidationRegistration): void {
		const { type } = registration;

		if (this.validations.has(type)) {
			console.warn(`Validation type '${type}' is already registered. Overriding.`);
		}

		this.validations.set(type, registration);
	}

	/**
	 * Register multiple validation types at once
	 */
	registerMultiple(registrations: ValidationRegistration[]): void {
		for (const registration of registrations) {
			this.register(registration);
		}
	}

	/**
	 * Check if a validation type is registered
	 */
	has(type: string): boolean {
		return this.validations.has(type);
	}

	/**
	 * Get a registered validation
	 */
	get(type: string): ValidationRegistration | undefined {
		return this.validations.get(type);
	}

	/**
	 * Create Zod schema from a validation rule
	 */
	createSchema(rule: ValidationRule | Record<string, any>): z.ZodTypeAny | null {
		const registration = this.validations.get(rule.type);
		if (!registration) {
			return null;
		}

		try {
			return registration.handler(rule as ValidationRule);
		} catch (error) {
			console.error(`Failed to create schema for validation rule '${rule.type}':`, error);
			return null;
		}
	}

	/**
	 * Get all registered validation types
	 */
	getRegisteredTypes(): string[] {
		return Array.from(this.validations.keys());
	}

	/**
	 * Get validations by category
	 */
	getByCategory(category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic'): ValidationRegistration[] {
		return Array.from(this.validations.values()).filter((v) => v.category === category);
	}

	/**
	 * Clear all registered validations
	 */
	clear(): void {
		this.validations.clear();
	}

	/**
	 * Unregister a validation type
	 */
	unregister(type: string): boolean {
		return this.validations.delete(type);
	}

	/**
	 * Built-in validation presets organized by type
	 */
	presets = {
		string: {
			required: (message?: string) => ({ type: 'required', message }),
			email: (message?: string) => ({
				type: 'email',
				message: message || 'Please enter a valid email address',
			}),
			minLength: (value: number, message?: string) => ({
				type: 'minLength',
				value,
				message: message || `Must be at least ${value} characters`,
			}),
			maxLength: (value: number, message?: string) => ({
				type: 'maxLength',
				value,
				message: message || `Must be no more than ${value} characters`,
			}),
			pattern: (pattern: string, message?: string) => ({
				type: 'pattern',
				value: pattern,
				message: message || 'Invalid format',
			}),
			url: (message?: string) => ({ type: 'url', message: message || 'Please enter a valid URL' }),
			uuid: (message?: string) => ({ type: 'uuid', message: message || 'Please enter a valid UUID' }),
			uuidv4: (message?: string) => ({
				type: 'uuid',
				version: 'v4',
				message: message || 'Please enter a valid UUID v4',
			}),
		},

		number: {
			required: (message?: string) => ({ type: 'required', message }),
			min: (value: number, message?: string) => ({
				type: 'min',
				value,
				message: message || `Must be at least ${value}`,
			}),
			max: (value: number, message?: string) => ({
				type: 'max',
				value,
				message: message || `Must be no more than ${value}`,
			}),
		},

		array: {
			required: (message?: string) => ({ type: 'required', message }),
			minItems: (value: number, message?: string) => ({
				type: 'minItems',
				value,
				message: message || `Must have at least ${value} items`,
			}),
			maxItems: (value: number, message?: string) => ({
				type: 'maxItems',
				value,
				message: message || `Must have no more than ${value} items`,
			}),
			nonEmpty: (message?: string) => ({
				type: 'minItems',
				value: 1,
				message: message || 'Cannot be empty',
			}),
		},

		network: {
			ipv4: (message?: string) => ({
				type: 'ip',
				version: 'v4',
				message: message || 'Please enter a valid IPv4 address',
			}),
			ipv6: (message?: string) => ({
				type: 'ip',
				version: 'v6',
				message: message || 'Please enter a valid IPv6 address',
			}),
		},

		date: {
			datetime: (message?: string) => ({
				type: 'datetime',
				message: message || 'Please enter a valid ISO datetime',
			}),
			date: (message?: string) => ({
				type: 'date',
				message: message || 'Please enter a valid ISO date',
			}),
			time: (message?: string) => ({
				type: 'time',
				message: message || 'Please enter a valid ISO time',
			}),
		},

		custom: {
			async: (
				url: string,
				options?: {
					method?: 'GET' | 'POST';
					headers?: Record<string, string>;
					body?: any;
					expectedResponse?: any;
					message?: string;
					dependencies?: string[];
				},
			): AsyncRule => ({
				type: 'async',
				url,
				method: options?.method || 'POST',
				headers: options?.headers,
				body: options?.body,
				expectedResponse: options?.expectedResponse,
				message: options?.message || 'Validation failed',
				dependencies: options?.dependencies,
			}),
		},
	};

	/**
	 * Register all built-in validation handlers
	 */
	private registerBuiltInValidations(): void {
		this.registerMultiple(defaultValidations);
	}
}

/**
 * Global validation registry instance
 */
export const validationRegistry = new ValidationRegistry();

/**
 * Helper function to register a validation
 */
export function registerValidation(registration: ValidationRegistration): void {
	validationRegistry.register(registration);
}

/**
 * Convenience export of validation presets from the global registry
 * For developers who want easy-to-use helpers instead of direct JSON
 */
export const ValidationPresets = validationRegistry.presets;
