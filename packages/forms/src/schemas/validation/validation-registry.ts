import * as z from 'zod/mini';
import type {
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
	 * Field references a rule reads besides the value under test.
	 *
	 * @remarks
	 * Lives on the registry because the answer comes from the registration, and
	 * `get` is keyed by the built-in rule union — a consumer-registered type is a
	 * plain string and would need a cast at every call site.
	 */
	getRuleDependencies(rule: { type: string }): readonly string[] {
		return this.validations.get(rule.type)?.dependsOn?.(rule) ?? [];
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
			logger.error(`Failed to create schema for validation rule '${rule.type}'`, { error });
			return null;
		}
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
 * Built-in handlers plus any caller-supplied registrations for one engine build.
 */
export function createDefaultValidationRegistry(): ValidationRegistry {
	const registry = new ValidationRegistry();
	registry.registerMultiple(defaultValidations);
	return registry;
}
