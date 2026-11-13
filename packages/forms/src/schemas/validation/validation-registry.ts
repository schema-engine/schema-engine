import * as z from 'zod/mini';
import { createRegistry, type ReadOnlyRegistry } from '@schema-engine/registry';
import type {
	AnyValidationRegistration,
	BaseValidationRule,
	ValidationContext,
	ValidationRegistration,
} from './types.js';
import { defaultValidations } from './defaults.js';
import { logger } from '@/lib/logger.js';

/** @remarks Rule-specific handlers are checked where a registration is defined, then stored together by rule type. */
type StoredValidationRegistration = ValidationRegistration<any>;

/**
 * Read-only store of validation registrations, with the lookups the renderers and the engine need.
 *
 * @remarks
 * Built by {@link createValidationRegistry}, so it has no `register`, `unregister` or `clear`: to
 * change the rules, build another registry from a new list. The per-field-type default rules are
 * derived from the registrations once, at build.
 */
export interface ValidationRegistry extends ReadOnlyRegistry<AnyValidationRegistration> {
	/**
	 * Default rules injected for a field `$type` when the author omitted them.
	 */
	getDefaultRulesForFieldType(fieldType: string): BaseValidationRule[];

	/**
	 * Field references a rule reads besides the value under test.
	 *
	 * @remarks
	 * Lives on the registry because the answer comes from the registration, and a
	 * consumer-registered type is a plain string that `get` would otherwise need
	 * a cast to reach at every call site.
	 */
	getRuleDependencies(rule: { type: string }): readonly string[];

	/** Registered rule types, in first-registration order. */
	getRegisteredTypes(): string[];

	/** Registrations of one category. */
	getByCategory(category: string): AnyValidationRegistration[];

	/**
	 * Create a Zod Mini schema from a validation rule, or `null` when the rule type is not registered
	 * or its handler throws.
	 *
	 * @param rule - The validation rule
	 * @param context - Form context for rules that read other fields
	 *
	 * @remarks
	 * `context` is required rather than optional so a caller cannot silently omit
	 * it: a renderer that did exactly that is why cross-field rules were inert on
	 * one of the two renderers. Build it with `createValidationContext`.
	 */
	createSchema<T extends { type: string }>(rule: T, context: ValidationContext): z.ZodMiniType | null;
}

function deriveDefaultRules(
	registrations: readonly AnyValidationRegistration[],
): ReadonlyMap<string, readonly BaseValidationRule[]> {
	const byFieldType = new Map<string, BaseValidationRule[]>();
	for (const registration of registrations) {
		for (const fieldType of registration.defaultFor ?? []) {
			const rules = byFieldType.get(fieldType) ?? [];
			rules.push({ type: registration.$type });
			byFieldType.set(fieldType, rules);
		}
	}
	return byFieldType;
}

/**
 * Build a read-only validation registry from a list of registrations.
 *
 * @param registrations - Validation registrations, keyed by `$type`
 * @throws {Error} Naming the `$type` when a winning registration's schema is not a Standard Schema
 *
 * @remarks
 * Stored by `createRegistry` from `@schema-engine/registry`: a later registration with the same
 * `$type` replaces the earlier one without a warning, so `[...defaults, custom]` overrides a rule.
 * The built-in rules are not added; use {@link createDefaultValidationRegistry} for those.
 */
export function createValidationRegistry(registrations: readonly AnyValidationRegistration[]): ValidationRegistry {
	const registry = createRegistry<AnyValidationRegistration>('Validation', registrations);
	const defaultRulesByFieldType = deriveDefaultRules(registry.all());

	return Object.freeze({
		...registry,
		getDefaultRulesForFieldType: (fieldType: string) => [...(defaultRulesByFieldType.get(fieldType) ?? [])],
		getRuleDependencies: (rule: { type: string }) =>
			(registry.get(rule.type) as StoredValidationRegistration | undefined)?.dependsOn?.(rule) ?? [],
		getRegisteredTypes: () => [...registry.keys()],
		getByCategory: (category: string) =>
			registry.all().filter((registration) => registration.category === category),
		createSchema: <T extends { type: string }>(rule: T, context: ValidationContext) => {
			const registration = registry.get(rule.type) as StoredValidationRegistration | undefined;
			if (!registration) {
				return null;
			}

			try {
				return registration.handler(rule, context);
			} catch (error) {
				logger.error(`Failed to create schema for validation rule '${rule.type}'`, { error });
				return null;
			}
		},
	});
}

/**
 * The built-in rules followed by any extra registrations, so an extra registration with a built-in
 * `$type` overrides it.
 */
export function createDefaultValidationRegistry(extra: readonly AnyValidationRegistration[] = []): ValidationRegistry {
	return createValidationRegistry([...defaultValidations, ...extra]);
}
