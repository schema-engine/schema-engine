import type { StandardSchemaV1 } from '@standard-schema/spec';
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
	ValidationRegistration,
	ValidationRegistrationMap,
} from './types.js';
import { logger } from '@/lib/logger.js';

/**
 * Common validation presets.
 * For developers who want easy-to-use helpers instead of direct JSON rules.
 */
export const ValidationPresets = {
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
 * Registry for validation rules
 * Provides registration, validation, and execution capabilities for validation types.
 */
export class ValidationRegistry {
	private validations = new Map<string, ValidationRegistration<any>>();

	register(registration: ValidationRegistration<any>): void {
		const type = registration.type;

		if (this.validations.has(type)) {
			logger.debug(`Validation type '${type}' is already registered. Overriding.`);
		}

		this.validations.set(type, registration);
	}

	registerMultiple(registrations: ValidationRegistration<any>[]): void {
		for (const registration of registrations) {
			this.register(registration);
		}
	}

	has(type: string): boolean {
		return this.validations.has(type);
	}

	get<K extends keyof ValidationRegistrationMap>(type: K): ValidationRegistrationMap[K] | undefined {
		return this.validations.get(type as string) as ValidationRegistrationMap[K] | undefined;
	}

	unregister(type: string): boolean {
		return this.validations.delete(type);
	}

	getRegisteredTypes(): string[] {
		return Array.from(this.validations.keys());
	}

	getByCategory(category: string): AnyValidationRegistration[] {
		return Array.from(this.validations.values()).filter(
			(v) => v.category === category,
		) as AnyValidationRegistration[];
	}

	createSchema<T extends { type: string }>(rule: T, formData?: Record<string, any>): StandardSchemaV1 | null {
		const registration = this.validations.get(rule.type) as ValidationRegistration<T> | undefined;
		if (!registration) {
			return null;
		}

		try {
			return registration.handler(rule, formData);
		} catch (error) {
			console.error(`Failed to create schema for validation rule '${rule.type}':`, error);
			return null;
		}
	}

	createStandardSchema<T extends { type: string }>(
		rule: T,
		formData?: Record<string, any>,
	): StandardSchemaV1 | null {
		return this.createSchema(rule, formData);
	}

	initialize(defaultValidations: AnyValidationRegistration[]): void {
		this.registerMultiple(defaultValidations);
	}
}

import { defaultValidations } from './defaults.js';

export const validationRegistry = new ValidationRegistry();

validationRegistry.initialize(defaultValidations);

export function registerValidation(registration: AnyValidationRegistration): void {
	validationRegistry.register(registration);
}
