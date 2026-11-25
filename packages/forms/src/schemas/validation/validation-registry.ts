import * as z from 'zod/mini';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
	createRegistry,
	safeParseNode,
	safeParseStandardSchema,
	type NodeLookup,
	type ReadOnlyRegistry,
} from '@schema-engine/registry';
import type {
	AnyValidationRegistration,
	BaseValidationRule,
	ValidationScope,
	ValidationRegistration,
	ValidationRegistrationConstraint,
} from './types.js';
import { defaultValidations } from './defaults.js';
import { BaseValidationRuleSchema } from './types.js';
import { ValidationRuleError } from './errors.js';
import { globalFetch, type FormFetch } from '@/lib/form-fetch';
import type { FormValidationIssue } from '@/lib/validate-form/issues';
import { fromSchemaIssues } from '@/lib/validate-form/schema-issues';
import { createValidationContext } from './utils.js';

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
	 *
	 * @remarks
	 * Frozen, and shared between calls. When a registration is replaced, its default rules keep the
	 * position the first registration of that `$type` had among the field type's defaults.
	 */
	getDefaultRulesForFieldType(fieldType: string): readonly BaseValidationRule[];

	/**
	 * Field references a rule reads besides the value under test.
	 *
	 * @remarks
	 * Lives on the registry because the answer comes from the registration, and a
	 * consumer-registered type is a plain string that `get` would otherwise need
	 * a cast to reach at every call site.
	 */
	getRuleDependencies(rule: { $type: string }): readonly string[];

	/** The options of a rule its registration exposes to messages (`{ minLength: 8 }`), or `undefined` when it exposes none. */
	getRuleParams(rule: { $type: string }): Readonly<Record<string, unknown>> | undefined;

	/** The fallback text of an issue of a rule: its author's `message`, or what its registration takes from the schema's `reported` text. */
	getRuleMessage(rule: { $type: string; message?: string }, reported: string | undefined): string | undefined;

	/** Registrations of one category. */
	getByCategory(category: string): AnyValidationRegistration[];

	/**
	 * The request function of the rules that make requests: the engine's `fetch`, or the global one for a standalone registry.
	 *
	 * @remarks `createSchema` hands it to every handler as `context.fetch`, whatever context the caller built.
	 */
	readonly fetch: FormFetch;

	/**
	 * Create a Zod Mini schema from a validation rule.
	 *
	 * @param rule - The validation rule
	 * @param context - Form context for rules that read other fields
	 * @throws {ValidationRuleError} When the rule type is not registered or its handler throws
	 *
	 * @remarks
	 * A rule that cannot be built is never skipped: a form that silently skipped it would accept values
	 * the author meant to reject. A config is checked with {@link ValidationRegistry.check} when it is
	 * validated, so reaching this error at run time means the registry changed after that.
	 *
	 * `context` is required rather than optional so a caller cannot silently omit
	 * it: a renderer that did exactly that is why cross-field rules were inert on
	 * one of the two renderers. Build it with `createValidationContext`.
	 *
	 * The rule type is generic, not `{ $type: string }`, so a rule literal with extra properties such as
	 * `{ $type: 'min', value: 10 }` is not rejected as an excess-property error.
	 */
	createSchema<T extends { $type: string }>(rule: T, context: ValidationScope): z.ZodMiniType;

	/**
	 * Whether a rule can be used, and the rule as its registration parses it.
	 *
	 * @remarks
	 * The one check of a rule written in a form config: its `$type` is registered, its options satisfy the
	 * registration's `schema`, and the handler builds a schema for it, so a rule that throws is found when
	 * the form config is validated and not when a user first types. The registration owns the shape, so a
	 * registration that replaces a built-in decides its options. The rule that comes back is the parsed
	 * one, which is what the handler runs on: the schema's defaults applied, and `$type`, `message`, `id` and
	 * `severity` kept from the authored rule even when the schema is a plain object that strips them.
	 *
	 * Issue paths are relative to the rule: an option the schema refuses is reported at its key, and a
	 * `$type` nothing registers or a handler that throws at `$type`.
	 */
	check(rule: { $type: string }): RuleCheck;
}

/** What {@link ValidationRegistry.check} found: the rule as its registration parses it, or the issues that make it unusable. */
export type RuleCheck =
	| { readonly ok: true; readonly rule: BaseValidationRule }
	| { readonly ok: false; readonly issues: readonly FormValidationIssue[] };

/** What a validation registry is built with besides its registrations. */
export interface ValidationRegistryOptions {
	/** The request function of rules that make requests; the global `fetch` by default. */
	readonly fetch?: FormFetch;
}

function deriveDefaultRules(
	registrations: readonly AnyValidationRegistration[],
): ReadonlyMap<string, readonly BaseValidationRule[]> {
	const byFieldType = new Map<string, BaseValidationRule[]>();
	for (const registration of registrations) {
		for (const fieldType of registration.defaultFor ?? []) {
			const rules = byFieldType.get(fieldType) ?? [];
			rules.push(Object.freeze({ $type: registration.$type }));
			byFieldType.set(fieldType, rules);
		}
	}
	for (const rules of byFieldType.values()) {
		Object.freeze(rules);
	}
	return byFieldType;
}

const NO_DEFAULT_RULES: readonly BaseValidationRule[] = Object.freeze([]);

const COMMON_RULE_KEYS = Object.keys(BaseValidationRuleSchema.shape);

/**
 * The rule as its registration parsed it, with the fields every rule has put back from the authored rule.
 *
 * @remarks
 * The engine owns `$type`, `message`, `id` and `severity`: a registration whose schema is a plain object
 * strips them, which would turn a `warning` into a blocking error and lose the author's text and `id`.
 * Options and defaults stay the registration's.
 */
function withCommonFields(parsed: BaseValidationRule, common: BaseValidationRule): BaseValidationRule {
	const kept = Object.fromEntries(
		COMMON_RULE_KEYS.flatMap((key) => (key in common && common[key] !== undefined ? [[key, common[key]]] : [])),
	);
	return { ...parsed, ...kept };
}

/** Says where to register a rule `$type` nothing registers, and lists the types that are, so a typo is easy to see. */
function unknownRuleHint(registrations: readonly AnyValidationRegistration[]): string {
	const registered = registrations.map((registration) => registration.$type).join(', ');
	return `Register it with createFormEngine({ validations: [...] }). Registered rules: ${registered}.`;
}

/**
 * The schema of a whole rule: the keys every rule has, then the registration's own schema, merged into the parsed
 * rule, then the handler, which must build a schema for it.
 *
 * @remarks
 * `safeParseNode` runs it only once it has found the registration, so the rule is an object with a registered
 * `$type`. Its issues are relative to the rule. A handler that throws is an issue at `$type`.
 */
function ruleSchema(registration: StoredValidationRegistration, fetch: FormFetch): StandardSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'schema-engine',
			validate(rule) {
				const common = safeParseStandardSchema(BaseValidationRuleSchema, rule);
				if (!common.success) return { issues: common.error.issues };
				const parsed = safeParseStandardSchema(registration.schema, rule);
				if (!parsed.success) return { issues: parsed.error.issues };
				const parsedRule = withCommonFields(parsed.data as BaseValidationRule, common.data);
				try {
					registration.handler(parsedRule, { ...createValidationContext(), fetch });
				} catch (error) {
					const reason = error instanceof Error ? error.message : String(error);
					return {
						issues: [
							{
								message: `Validation rule '${registration.$type}' could not be built: ${reason}`,
								path: ['$type'],
							},
						],
					};
				}
				return { value: parsedRule };
			},
		},
	};
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
 *
 * Takes {@link ValidationRegistrationConstraint}, which erases each rule type so a
 * `ValidationRegistration<PostcodeRule>` is accepted; the registrations are stored as
 * {@link AnyValidationRegistration} after that single cast.
 */
export function createValidationRegistry(
	registrations: readonly ValidationRegistrationConstraint[],
	options: ValidationRegistryOptions = {},
): ValidationRegistry {
	const { fetch = globalFetch } = options;
	const registry = createRegistry<AnyValidationRegistration>(
		'Validation',
		registrations as readonly AnyValidationRegistration[],
	);
	const defaultRulesByFieldType = deriveDefaultRules(registry.all());
	const rules: NodeLookup<{ schema: StandardSchemaV1 }> = {
		get(type) {
			const registration = registry.get(type) as StoredValidationRegistration | undefined;
			return registration && { schema: ruleSchema(registration, fetch) };
		},
		hint: () => unknownRuleHint(registry.all()),
	};

	const api: ValidationRegistry = {
		...registry,
		getDefaultRulesForFieldType: (fieldType) => defaultRulesByFieldType.get(fieldType) ?? NO_DEFAULT_RULES,
		getRuleDependencies: (rule) =>
			(registry.get(rule.$type) as StoredValidationRegistration | undefined)?.dependsOn?.(rule) ?? [],
		getRuleMessage: (rule, reported) => {
			const registration = registry.get(rule.$type) as StoredValidationRegistration | undefined;
			return registration?.message ? registration.message(rule, reported) : rule.message;
		},
		getRuleParams: (rule) => (registry.get(rule.$type) as StoredValidationRegistration | undefined)?.params?.(rule),
		getByCategory: (category) => registry.all().filter((registration) => registration.category === category),
		fetch,
		createSchema: (rule, context) => {
			const registration = registry.get(rule.$type) as StoredValidationRegistration | undefined;
			if (!registration) {
				throw new ValidationRuleError(
					rule.$type,
					`No registration for $type '${rule.$type}'. ${unknownRuleHint(registry.all())}`,
				);
			}

			try {
				return registration.handler(rule, { ...context, fetch });
			} catch (cause) {
				throw new ValidationRuleError(rule.$type, `Validation rule '${rule.$type}' could not be built.`, {
					cause,
				});
			}
		},
		check: (rule) => {
			const checked = safeParseNode(rules, rule);
			if (!checked.success) return { ok: false, issues: fromSchemaIssues(checked.issues, []) };
			return { ok: true, rule: checked.data as BaseValidationRule };
		},
	};
	return Object.freeze(api);
}

/**
 * The built-in rules followed by any extra registrations, so an extra registration with a built-in
 * `$type` overrides it.
 */
export function createDefaultValidationRegistry(
	extra: readonly ValidationRegistrationConstraint[] = [],
	options: ValidationRegistryOptions = {},
): ValidationRegistry {
	return createValidationRegistry([...defaultValidations, ...extra], options);
}
