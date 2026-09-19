import * as z from 'zod/mini';
import type {
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
	Ipv4Rule,
	Ipv6Rule,
	DateTimeRule,
	DateRule,
	TimeRule,
	CuidRule,
	Cuid2Rule,
	UlidRule,
	HexRule,
	AnyValidationRegistration,
	BaseValidationRule,
	ValidationContext,
	ValidationRegistration,
	ValidationRegistrationMap,
} from './types.js';
import { logger } from '@/lib/logger.js';

/**
 * Registry for validation rules
 * Provides registration, validation, and execution capabilities for validation types.
 */
export class ValidationRegistry {
	private validations = new Map<string, ValidationRegistration<any>>();
	private defaultRulesByFieldType = new Map<string, Map<string, BaseValidationRule>>();

	/**
	 * Register a new validation type
	 */
	register(registration: ValidationRegistration<any>): void {
		const type = registration.type;

		if (this.validations.has(type)) {
			logger.debug(`Validation type '${type}' is already registered. Overriding.`);
		}

		this.validations.set(type, registration);
		this.bindDefaultFor(registration);
	}

	/**
	 * Register multiple validation types at once
	 */
	registerMultiple(registrations: ValidationRegistration<any>[]): void {
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
	 * Get a registration by type
	 */
	get<K extends keyof ValidationRegistrationMap>(type: K): ValidationRegistrationMap[K] | undefined {
		return this.validations.get(type as string) as ValidationRegistrationMap[K] | undefined;
	}

	/**
	 * Remove a validation type
	 */
	unregister(type: string): boolean {
		this.unbindDefaultFor(type);
		return this.validations.delete(type);
	}

	/**
	 * Default rules injected for a field `$type` when the author omitted them.
	 */
	getDefaultRulesForFieldType(fieldType: string): BaseValidationRule[] {
		const rules = this.defaultRulesByFieldType.get(fieldType);
		return rules ? [...rules.values()] : [];
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
	getByCategory(category: string): AnyValidationRegistration[] {
		return Array.from(this.validations.values()).filter(
			(v) => v.category === category,
		) as AnyValidationRegistration[];
	}

	/**
	 * Create a Zod Mini schema from a validation rule
	 *
	 * @param rule - The validation rule
	 * @param context - Form context for rules that read other fields
	 *
	 * @remarks
	 * `context` is required rather than optional so a caller cannot silently omit
	 * it: a renderer that did exactly that is why cross-field rules were inert on
	 * one of the two renderers. Build it with `createValidationContext`.
	 */
	createSchema<T extends { type: string }>(rule: T, context: ValidationContext): z.ZodMiniType | null {
		const registration = this.validations.get(rule.type) as ValidationRegistration<T> | undefined;
		if (!registration) {
			return null;
		}

		try {
			return registration.handler(rule, context);
		} catch (error) {
			console.error(`Failed to create schema for validation rule '${rule.type}':`, error);
			return null;
		}
	}

	/**
	 * Common validation presets
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
			cuid: (message?: string): CuidRule => ({ type: 'cuid', message }),
			cuid2: (message?: string): Cuid2Rule => ({ type: 'cuid2', message }),
			ulid: (message?: string): UlidRule => ({ type: 'ulid', message }),
			hex: (message?: string): HexRule => ({ type: 'hex', message }),
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

		boolean: {
			required: (message?: string): RequiredRule => ({ type: 'required', message }),
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
			ipv4: (message?: string): Ipv4Rule => ({
				type: 'ipv4',
				message: message || 'Please enter a valid IPv4 address',
			}),
			ipv6: (message?: string): Ipv6Rule => ({
				type: 'ipv6',
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
	 * @param defaultValidations - The default validations to register
	 */
	initialize(defaultValidations: AnyValidationRegistration[]): void {
		this.registerMultiple(defaultValidations);
	}

	private unbindDefaultFor(ruleType: string): void {
		for (const [fieldType, rules] of this.defaultRulesByFieldType) {
			rules.delete(ruleType);
			if (rules.size === 0) {
				this.defaultRulesByFieldType.delete(fieldType);
			}
		}
	}

	private bindDefaultFor(registration: ValidationRegistration<any>): void {
		this.unbindDefaultFor(registration.type);
		for (const fieldType of registration.defaultFor ?? []) {
			let rules = this.defaultRulesByFieldType.get(fieldType);
			if (!rules) {
				rules = new Map();
				this.defaultRulesByFieldType.set(fieldType, rules);
			}
			rules.set(registration.type, { type: registration.type });
		}
	}
}

import { defaultValidations } from './defaults.js';

/**
 * Global validation registry instance
 */
export const validationRegistry = new ValidationRegistry();

validationRegistry.initialize(defaultValidations);

/**
 * Helper function to register a validation
 */
export function registerValidation(registration: AnyValidationRegistration): void {
	validationRegistry.register(registration);
}

/**
 * Convenience export of validation presets from the global registry
 * For developers who want easy-to-use helpers instead of direct JSON
 */
export const ValidationPresets = validationRegistry.presets;
