import * as z from 'zod/mini';

const BaseValidationRuleSchema = z.object({
	type: z.string(),
	message: z.optional(z.string()),
});

const RequiredRuleSchema = z.object({
	type: z.literal('required'),
	message: z.optional(z.string()),
});

const MinLengthRuleSchema = z.object({
	type: z.literal('minLength'),
	value: z.number(),
	message: z.optional(z.string()),
});

const MaxLengthRuleSchema = z.object({
	type: z.literal('maxLength'),
	value: z.number(),
	message: z.optional(z.string()),
});

const EmailRuleSchema = z.object({
	type: z.literal('email'),
	pattern: z.optional(z.string()),
	message: z.optional(z.string()),
});

const PhoneRuleSchema = z.object({
	type: z.literal('phone'),
	message: z.optional(z.string()),
});

const PatternRuleSchema = z.object({
	type: z.literal('pattern'),
	value: z.string(),
	message: z.optional(z.string()),
});

const UrlRuleSchema = z.object({
	type: z.literal('url'),
	protocol: z.optional(z.string()),
	hostname: z.optional(z.string()),
	message: z.optional(z.string()),
});

const UuidRuleSchema = z.object({
	type: z.literal('uuid'),
	version: z.optional(z.enum(['v1', 'v2', 'v3', 'v4', 'v5'])),
	message: z.optional(z.string()),
});

const Ipv4RuleSchema = z.object({
	type: z.literal('ipv4'),
	message: z.optional(z.string()),
});

const Ipv6RuleSchema = z.object({
	type: z.literal('ipv6'),
	message: z.optional(z.string()),
});

const CidrRuleSchema = z.object({
	type: z.literal('cidr'),
	version: z.optional(z.enum(['v4', 'v6'])),
	message: z.optional(z.string()),
});

const JwtRuleSchema = z.object({
	type: z.literal('jwt'),
	alg: z.optional(z.string()),
	message: z.optional(z.string()),
});

const HashRuleSchema = z.object({
	type: z.literal('hash'),
	algorithm: z.enum(['md5', 'sha1', 'sha256', 'sha384', 'sha512']),
	message: z.optional(z.string()),
});

const Base64RuleSchema = z.object({
	type: z.literal('base64'),
	urlSafe: z.optional(z.boolean()),
	message: z.optional(z.string()),
});

const CuidRuleSchema = z.object({
	type: z.literal('cuid'),
	message: z.optional(z.string()),
});

const Cuid2RuleSchema = z.object({
	type: z.literal('cuid2'),
	message: z.optional(z.string()),
});

const UlidRuleSchema = z.object({
	type: z.literal('ulid'),
	message: z.optional(z.string()),
});

const HexRuleSchema = z.object({
	type: z.literal('hex'),
	message: z.optional(z.string()),
});

const MinRuleSchema = z.object({
	type: z.literal('min'),
	value: z.number(),
	message: z.optional(z.string()),
});

const MaxRuleSchema = z.object({
	type: z.literal('max'),
	value: z.number(),
	message: z.optional(z.string()),
});

const MinItemsRuleSchema = z.object({
	type: z.literal('minItems'),
	value: z.number(),
	message: z.optional(z.string()),
});

const MaxItemsRuleSchema = z.object({
	type: z.literal('maxItems'),
	value: z.number(),
	message: z.optional(z.string()),
});

const DateTimeRuleSchema = z.object({
	type: z.literal('datetime'),
	precision: z.optional(z.number()),
	offset: z.optional(z.boolean()),
	local: z.optional(z.boolean()),
	message: z.optional(z.string()),
});

const DateRuleSchema = z.object({
	type: z.literal('date'),
	message: z.optional(z.string()),
});

const TimeRuleSchema = z.object({
	type: z.literal('time'),
	precision: z.optional(z.number()),
	message: z.optional(z.string()),
});

const AsyncRuleSchema = z.object({
	type: z.literal('async'),
	url: z.string(),
	method: z._default(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']), 'POST'),
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
	message: z.optional(z.string()),
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

const RelateRuleSchema = z.object({
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
	message: z.optional(z.string()),
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
}

/**
 * Validation rule registration definition
 * @template TRule - Specific rule type for type-safe handler
 */
export interface ValidationRegistration<TRule extends { type: string } = { type: string } & Record<string, unknown>> {
	type: TRule['type'];
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
	| (ValidationRule extends infer T
			? T extends ValidationRule
				? ValidationRegistration<T>
				: never
			: never)
	| ValidationRegistration;

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
