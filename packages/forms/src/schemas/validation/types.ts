import type { FormFetch } from '@/lib/form-fetch';
import * as z from 'zod/mini';
import type { BaseRegistration, RegistrationMetadata } from '@schema-engine/registry';
import type { DebounceScope } from '../../lib/debounce.js';

const RegexPatternSchema = z.string().check(
	z.refine((value) => {
		try {
			RegExp(value);
			return true;
		} catch {
			return false;
		}
	}, 'Must be a valid regular expression'),
);

/**
 * What every rule can say about itself besides its `type`.
 *
 * @remarks
 * `message` is the fallback text of the issue the rule reports. `id` is the author's stable name for the
 * rule, so two rules of one type (two `pattern`s) stay distinguishable and a translation can be keyed to
 * one of them. A `severity` of `'warning'` makes the rule advice: its issue goes to `warnings`, and never
 * decides whether the form is valid.
 */
const ruleFields = {
	message: z.optional(z.string()),
	id: z.optional(z.string()),
	severity: z.optional(z.enum(['error', 'warning'])),
};

export const BaseValidationRuleSchema = z.object({
	type: z.string(),
	...ruleFields,
});

export const RequiredRuleSchema = z.object({
	type: z.literal('required'),
	...ruleFields,
});

export const MinLengthRuleSchema = z.object({
	type: z.literal('minLength'),
	value: z.number(),
	...ruleFields,
});

export const MaxLengthRuleSchema = z.object({
	type: z.literal('maxLength'),
	value: z.number(),
	...ruleFields,
});

export const EmailRuleSchema = z.object({
	type: z.literal('email'),
	pattern: z.optional(RegexPatternSchema),
	...ruleFields,
});

export const PhoneRuleSchema = z.object({
	type: z.literal('phone'),
	...ruleFields,
});

export const PatternRuleSchema = z.object({
	type: z.literal('pattern'),
	value: RegexPatternSchema,
	...ruleFields,
});

export const UrlRuleSchema = z.object({
	type: z.literal('url'),
	protocol: z.optional(RegexPatternSchema),
	hostname: z.optional(RegexPatternSchema),
	...ruleFields,
});

export const UuidRuleSchema = z.object({
	type: z.literal('uuid'),
	version: z.optional(z.enum(['v1', 'v2', 'v3', 'v4', 'v5'])),
	...ruleFields,
});

export const Ipv4RuleSchema = z.object({
	type: z.literal('ipv4'),
	...ruleFields,
});

export const Ipv6RuleSchema = z.object({
	type: z.literal('ipv6'),
	...ruleFields,
});

export const CidrRuleSchema = z.object({
	type: z.literal('cidr'),
	version: z.optional(z.enum(['v4', 'v6'])),
	...ruleFields,
});

export const JwtRuleSchema = z.object({
	type: z.literal('jwt'),
	alg: z.optional(z.string()),
	...ruleFields,
});

export const HashRuleSchema = z.object({
	type: z.literal('hash'),
	algorithm: z.enum(['md5', 'sha1', 'sha256', 'sha384', 'sha512']),
	...ruleFields,
});

export const Base64RuleSchema = z.object({
	type: z.literal('base64'),
	urlSafe: z.optional(z.boolean()),
	...ruleFields,
});

export const CuidRuleSchema = z.object({
	type: z.literal('cuid'),
	...ruleFields,
});

export const Cuid2RuleSchema = z.object({
	type: z.literal('cuid2'),
	...ruleFields,
});

export const UlidRuleSchema = z.object({
	type: z.literal('ulid'),
	...ruleFields,
});

export const HexRuleSchema = z.object({
	type: z.literal('hex'),
	...ruleFields,
});

export const MinRuleSchema = z.object({
	type: z.literal('min'),
	value: z.number(),
	...ruleFields,
});

export const MaxRuleSchema = z.object({
	type: z.literal('max'),
	value: z.number(),
	...ruleFields,
});

export const MinItemsRuleSchema = z.object({
	type: z.literal('minItems'),
	value: z.number(),
	...ruleFields,
});

export const MaxItemsRuleSchema = z.object({
	type: z.literal('maxItems'),
	value: z.number(),
	...ruleFields,
});

export const DateTimeRuleSchema = z.object({
	type: z.literal('datetime'),
	precision: z.optional(z.number()),
	offset: z.optional(z.boolean()),
	local: z.optional(z.boolean()),
	...ruleFields,
});

export const DateRuleSchema = z.object({
	type: z.literal('date'),
	...ruleFields,
});

export const TimeRuleSchema = z.object({
	type: z.literal('time'),
	precision: z.optional(z.number()),
	...ruleFields,
});

export const AsyncRuleSchema = z.object({
	type: z.literal('async'),
	url: z.string(),
	method: z.optional(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])),
	headers: z.optional(z.record(z.string(), z.string())),
	extraPayload: z.optional(z.record(z.string(), z.unknown())),
	expectedResponse: z.optional(
		z.object({
			valid: z.optional(z.boolean()),
			success: z.optional(z.boolean()),
			message: z.optional(z.string()),
			error: z.optional(z.string()),
		}),
	),
	...ruleFields,
	dependencies: z.optional(z.array(z.string())),
	debounce: z.optional(z.number()),
	cacheTTL: z.optional(z.number()),
	disableCache: z.optional(z.boolean()),
});

/**
 * Named comparisons a {@link RelateRuleSchema} can make over the referenced values.
 *
 * @remarks
 * Ordering assertions read left to right over `fields` (with the declaring
 * field's own value first, unless `includeSelf` is off), so `descending` on
 * `[endDate, startDate]` asserts that the end date is the later one.
 */
export const RelationAssertSchema = z.enum([
	'allEqual',
	'allDifferent',
	'ascending',
	'strictlyAscending',
	'descending',
	'strictlyDescending',
	'atLeastOne',
	'exactlyOne',
	'allOrNone',
]);

export const RelateRuleSchema = z.object({
	type: z.literal('relate'),
	fields: z
		.array(z.string())
		.check(z.minLength(1), z.describe('Field references, each resolved relative to the field declaring the rule.')),
	assert: RelationAssertSchema,
	includeSelf: z
		._default(z.boolean(), true)
		.check(z.describe('Own value participates, first in the list. Off for assertions about a group.')),
	as: z
		._default(z.enum(['auto', 'string', 'number', 'date', 'boolean']), 'auto')
		.check(z.describe('Comparison basis. `auto` compares values as they are.')),
	skipWhenIncomplete: z
		._default(z.boolean(), true)
		.check(
			z.describe(
				'Stay quiet while any participating value is empty. Ignored by the assertions about emptiness: `atLeastOne`, `exactlyOne`, `allOrNone`.',
			),
		),
	...ruleFields,
});

export const ValidationRuleSchema = z.union([
	RequiredRuleSchema,
	MinLengthRuleSchema,
	MaxLengthRuleSchema,
	MinRuleSchema,
	MaxRuleSchema,
	MinItemsRuleSchema,
	MaxItemsRuleSchema,
	EmailRuleSchema,
	PhoneRuleSchema,
	PatternRuleSchema,
	UrlRuleSchema,
	UuidRuleSchema,
	DateTimeRuleSchema,
	DateRuleSchema,
	TimeRuleSchema,
	Ipv4RuleSchema,
	Ipv6RuleSchema,
	CidrRuleSchema,
	JwtRuleSchema,
	HashRuleSchema,
	Base64RuleSchema,
	CuidRuleSchema,
	Cuid2RuleSchema,
	UlidRuleSchema,
	HexRuleSchema,
	AsyncRuleSchema,
	RelateRuleSchema,
]);

export type BaseValidationRule = z.infer<typeof BaseValidationRuleSchema>;
export type RequiredRule = z.infer<typeof RequiredRuleSchema>;
export type MinLengthRule = z.infer<typeof MinLengthRuleSchema>;
export type MaxLengthRule = z.infer<typeof MaxLengthRuleSchema>;
export type MinRule = z.infer<typeof MinRuleSchema>;
export type MaxRule = z.infer<typeof MaxRuleSchema>;
export type MinItemsRule = z.infer<typeof MinItemsRuleSchema>;
export type MaxItemsRule = z.infer<typeof MaxItemsRuleSchema>;
export type EmailRule = z.infer<typeof EmailRuleSchema>;
export type PhoneRule = z.infer<typeof PhoneRuleSchema>;
export type PatternRule = z.infer<typeof PatternRuleSchema>;
export type UrlRule = z.infer<typeof UrlRuleSchema>;
export type UuidRule = z.infer<typeof UuidRuleSchema>;
export type DateTimeRule = z.infer<typeof DateTimeRuleSchema>;
export type DateRule = z.infer<typeof DateRuleSchema>;
export type TimeRule = z.infer<typeof TimeRuleSchema>;
export type Ipv4Rule = z.infer<typeof Ipv4RuleSchema>;
export type Ipv6Rule = z.infer<typeof Ipv6RuleSchema>;
export type CidrRule = z.infer<typeof CidrRuleSchema>;
export type JwtRule = z.infer<typeof JwtRuleSchema>;
export type HashRule = z.infer<typeof HashRuleSchema>;
export type Base64Rule = z.infer<typeof Base64RuleSchema>;
export type CuidRule = z.infer<typeof CuidRuleSchema>;
export type Cuid2Rule = z.infer<typeof Cuid2RuleSchema>;
export type UlidRule = z.infer<typeof UlidRuleSchema>;
export type HexRule = z.infer<typeof HexRuleSchema>;
export type AsyncRule = z.infer<typeof AsyncRuleSchema>;
export type RelationAssert = z.infer<typeof RelationAssertSchema>;
export type RelateRule = z.infer<typeof RelateRuleSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

/**
 * Everything a validation handler may read beyond the value under test.
 *
 * @remarks
 * `fieldPath` is the field's *rendered* path (`contacts.0.email`), not the
 * authored template, which is what lets a rule address a sibling inside its own
 * array row. Prefer {@link ValidationContext.resolve} over reading
 * {@link ValidationContext.values} directly: it applies that scoping, and it is
 * the same resolution constraints use, so one authored name cannot mean two
 * different fields.
 */
export interface ValidationContext {
	/** Nested value tree for the whole form. */
	readonly values: Record<string, unknown>;
	/** Rendered path of the field being validated, e.g. `contacts.0.email`. */
	readonly fieldPath: string;
	/**
	 * Reads another field relative to this one: a bare name is a sibling, a
	 * dotted name is absolute from the form root.
	 */
	readonly resolve: (fieldRef: string) => unknown;
	/** Debounced work shared by parses that receive this scope. */
	readonly debounceScope: DebounceScope;
	/** Makes the requests of a rule: the engine's `fetch`, with its CSRF policy applied. A registry sets it on every context it builds a schema from. */
	readonly fetch: FormFetch;
}

/**
 * Validation rule registration: the shared registration shape plus the handler that builds the rule's schema.
 *
 * @remarks
 * `$type` is the `type` authors write in a field's `rules`, so a registration with
 * `$type: 'postcode'` handles `{ type: 'postcode' }`. The rule objects themselves keep
 * `type`; `schema` describes them.
 *
 * @template TRule - Specific rule type for type-safe handler
 */
export interface ValidationRegistration<
	TRule extends { type: string } = { type: string } & Record<string, unknown>,
> extends BaseRegistration<TRule, RegistrationMetadata> {
	$type: TRule['type'];
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic' | 'cross-field';
	/**
	 * Validation handler function
	 * @param rule - The validation rule configuration (typed to specific rule type)
	 * @param context - The form context, for rules that read fields other than the one under test
	 * @returns Zod Mini schema for validation
	 */
	handler: (rule: TRule, context: ValidationContext) => z.ZodMiniType;
	/**
	 * Field references this rule reads besides the value under test.
	 *
	 * @remarks
	 * Renderers re-validate the declaring field when any of these change. Returned
	 * as authored references; the caller resolves them against the field's path,
	 * so a rule inside an array row watches that row.
	 */
	dependsOn?: (rule: TRule) => readonly string[];
	/**
	 * The options of this rule that a message can be built from, named like the native constraint they match.
	 *
	 * @remarks
	 * They reach every issue the rule reports, and so a snapshot, an action context and a formatter: a
	 * registration decides what it shows. `minLength` returns `{ minLength: 8 }`, as the native
	 * `ValidityState` constraint is named, and a rule whose options are configuration (`async`'s url and
	 * headers, `relate`'s field list) returns nothing. Values must be serializable.
	 */
	params?: (rule: TRule) => Readonly<Record<string, unknown>> | undefined;
	/**
	 * The fallback text of an issue this rule reports, given the text its schema reported.
	 *
	 * @remarks
	 * By default the text is the author's own `message` on the rule. Text a registration makes up is the
	 * application's language and belongs above the engine, as does the schema library's generic text, so a
	 * registration reports a `type` and `params` and never default English. Return `reported` only for text
	 * that genuinely comes from outside the engine, such as the message an `async` rule's endpoint answers with.
	 */
	message?: (rule: TRule, reported: string | undefined) => string | undefined;
	/**
	 * Field `$type` values that receive this rule when the author omitted it.
	 *
	 * @remarks Lets an integration attach a rule (for example `phone` on
	 * `phone-input`) without putting that field type or its library into the
	 * forms package.
	 */
	defaultFor?: readonly string[];
}

/**
 * Union of all possible validation registrations based on ValidationRule union.
 * This allows heterogeneous arrays (like defaultValidations) to be typed without 'any'.
 */
export type AnyValidationRegistration =
	| (ValidationRule extends infer T ? (T extends ValidationRule ? ValidationRegistration<T> : never) : never)
	| ValidationRegistration;

/**
 * A validation registration as `createFormEngine({ validations })`, an element's `validations` and the
 * registry factories accept it.
 *
 * @remarks
 * `handler` and `dependsOn` take `never`, so a registration typed for one rule shape, such as
 * `ValidationRegistration<PostcodeRule>`, is accepted without widening its rule type. `handler` still
 * has to return a Zod Mini schema: a handler that returns anything else does not compile.
 */
export type ValidationRegistrationConstraint = {
	readonly $type: string;
	readonly schema: { readonly '~standard': { readonly validate: (value: unknown) => unknown } };
	readonly metadata: { readonly name: string };
	readonly category: ValidationRegistration['category'];
	readonly handler: (rule: never, context: ValidationContext) => z.ZodMiniType;
	readonly dependsOn?: (rule: never) => readonly string[];
	readonly params?: (rule: never) => Readonly<Record<string, unknown>> | undefined;
	readonly message?: (rule: never, reported: string | undefined) => string | undefined;
	readonly defaultFor?: readonly string[];
};

/**
 * Mapping of validation rule types to their specific rule interfaces.
 */
export type ValidationTypeMap = {
	[K in ValidationRule['type']]: Extract<ValidationRule, { type: K }>;
};

/**
 * Mapping of validation rule types to their specific registrations.
 */
export type ValidationRegistrationMap = {
	[K in ValidationRule['type']]: ValidationRegistration<ValidationTypeMap[K]>;
};
