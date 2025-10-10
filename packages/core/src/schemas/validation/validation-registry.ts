import type { z } from 'zod';
import type {
	ValidationRule,
	AsyncRule,
	RequiredRule,
	EmailRule,
	MinLengthRule,
	MaxLengthRule,
	PatternRule,
	UrlRule,
	UuidRule,
	MinRule,
	MaxRule,
	MinItemsRule,
	MaxItemsRule,
	IpRule,
	DateTimeRule,
	DateRule,
	TimeRule,
} from './types.js';
import { defaultValidations } from './defaults.js';
import { logger } from '@/lib/logger.js';

/**
 * Validation rule registration definition
 */
export interface ValidationRegistration {
	type: string;
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic';
	/**
	 * Validation handler function
	 * @param rule - The validation rule configuration
	 * @param formData - Optional form data for cross-field validation (available in custom resolver)
	 * @returns Zod schema for validation
	 */
	handler: (rule: ValidationRule, formData?: Record<string, any>) => z.ZodTypeAny;
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
			logger.warn(`Validation type '${type}' is already registered. Overriding.`);
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
	 * @param rule - The validation rule
	 * @param formData - Optional form data for cross-field validation
	 * @param fieldName - Optional field name for context (used by async validation)
	 */
	createSchema(
		rule: ValidationRule | Record<string, any>,
		formData?: Record<string, any>,
		fieldName?: string,
	): z.ZodTypeAny | null {
		const registration = this.validations.get(rule.type);
		if (!registration) {
			return null;
		}

		try {
			// Pass field name to handler for async validation
			if (rule.type === 'async' && fieldName) {
				const asyncHandler = registration.handler as (
					rule: ValidationRule,
					formData?: Record<string, any>,
					fieldName?: string,
				) => z.ZodTypeAny;
				return asyncHandler(rule as ValidationRule, formData, fieldName);
			}
			return registration.handler(rule as ValidationRule, formData);
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
			required: (message?: string): RequiredRule => ({ type: 'required', message }),
			email: (message?: string): EmailRule => ({
				type: 'email',
				message: message || 'Please enter a valid email address',
			}),
			minLength: (value: number, message?: string): MinLengthRule => ({
				type: 'minLength',
				value,
				message: message || `Must be at least ${value} characters`,
			}),
			maxLength: (value: number, message?: string): MaxLengthRule => ({
				type: 'maxLength',
				value,
				message: message || `Must be no more than ${value} characters`,
			}),
			pattern: (pattern: string, message?: string): PatternRule => ({
				type: 'pattern',
				value: pattern,
				message: message || 'Invalid format',
			}),
			url: (message?: string): UrlRule => ({ type: 'url', message: message || 'Please enter a valid URL' }),
			uuid: (message?: string): UuidRule => ({ type: 'uuid', message: message || 'Please enter a valid UUID' }),
			uuidv4: (message?: string): UuidRule => ({
				type: 'uuid',
				version: 'v4',
				message: message || 'Please enter a valid UUID v4',
			}),
		},

		number: {
			required: (message?: string): RequiredRule => ({ type: 'required', message }),
			min: (value: number, message?: string): MinRule => ({
				type: 'min',
				value,
				message: message || `Must be at least ${value}`,
			}),
			max: (value: number, message?: string): MaxRule => ({
				type: 'max',
				value,
				message: message || `Must be no more than ${value}`,
			}),
		},

		array: {
			required: (message?: string): RequiredRule => ({ type: 'required', message }),
			minItems: (value: number, message?: string): MinItemsRule => ({
				type: 'minItems',
				value,
				message: message || `Must have at least ${value} items`,
			}),
			maxItems: (value: number, message?: string): MaxItemsRule => ({
				type: 'maxItems',
				value,
				message: message || `Must have no more than ${value} items`,
			}),
			nonEmpty: (message?: string): MinItemsRule => ({
				type: 'minItems',
				value: 1,
				message: message || 'Cannot be empty',
			}),
		},

		network: {
			ipv4: (message?: string): IpRule => ({
				type: 'ip',
				version: 'v4',
				message: message || 'Please enter a valid IPv4 address',
			}),
			ipv6: (message?: string): IpRule => ({
				type: 'ip',
				version: 'v6',
				message: message || 'Please enter a valid IPv6 address',
			}),
		},

		date: {
			datetime: (message?: string): DateTimeRule => ({
				type: 'datetime',
				message: message || 'Please enter a valid ISO datetime',
			}),
			date: (message?: string): DateRule => ({
				type: 'date',
				message: message || 'Please enter a valid ISO date',
			}),
			time: (message?: string): TimeRule => ({
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
					extraPayload?: Record<string, unknown>;
					expectedResponse?: any;
					message?: string;
					dependencies?: string[];
				},
			): AsyncRule => ({
				type: 'async',
				url,
				method: options?.method || 'POST',
				headers: options?.headers,
				extraPayload: options?.extraPayload,
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
