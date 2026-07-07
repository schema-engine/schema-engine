import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';

const BaseValidationRuleSchema = z.object({
	type: z.string(),
	message: z.string().optional(),
});

const RequiredRuleSchema = z.object({
	type: z.literal('required'),
	message: z.string().optional(),
});

const MinLengthRuleSchema = z.object({
	type: z.literal('minLength'),
	value: z.number(),
	message: z.string().optional(),
});

const MaxLengthRuleSchema = z.object({
	type: z.literal('maxLength'),
	value: z.number(),
	message: z.string().optional(),
});

const EmailRuleSchema = z.object({
	type: z.literal('email'),
	pattern: z.string().optional(),
	message: z.string().optional(),
});

const PatternRuleSchema = z.object({
	type: z.literal('pattern'),
	value: z.string(),
	message: z.string().optional(),
});

const UrlRuleSchema = z.object({
	type: z.literal('url'),
	protocol: z.string().optional(),
	hostname: z.string().optional(),
	message: z.string().optional(),
});

const UuidRuleSchema = z.object({
	type: z.literal('uuid'),
	version: z.enum(['v1', 'v2', 'v3', 'v4', 'v5']).optional(),
	message: z.string().optional(),
});

const Ipv4RuleSchema = z.object({
	type: z.literal('ipv4'),
	message: z.string().optional(),
});

const Ipv6RuleSchema = z.object({
	type: z.literal('ipv6'),
	message: z.string().optional(),
});

const CidrRuleSchema = z.object({
	type: z.literal('cidr'),
	version: z.enum(['v4', 'v6']).optional(),
	message: z.string().optional(),
});

const JwtRuleSchema = z.object({
	type: z.literal('jwt'),
	alg: z.string().optional(),
	message: z.string().optional(),
});

const HashRuleSchema = z.object({
	type: z.literal('hash'),
	algorithm: z.enum(['md5', 'sha1', 'sha256', 'sha384', 'sha512']),
	message: z.string().optional(),
});

const Base64RuleSchema = z.object({
	type: z.literal('base64'),
	urlSafe: z.boolean().optional(),
	message: z.string().optional(),
});

const CuidRuleSchema = z.object({
	type: z.literal('cuid'),
	message: z.string().optional(),
});

const Cuid2RuleSchema = z.object({
	type: z.literal('cuid2'),
	message: z.string().optional(),
});

const UlidRuleSchema = z.object({
	type: z.literal('ulid'),
	message: z.string().optional(),
});

const HexRuleSchema = z.object({
	type: z.literal('hex'),
	message: z.string().optional(),
});

const MinRuleSchema = z.object({
	type: z.literal('min'),
	value: z.number(),
	message: z.string().optional(),
});

const MaxRuleSchema = z.object({
	type: z.literal('max'),
	value: z.number(),
	message: z.string().optional(),
});

const MinItemsRuleSchema = z.object({
	type: z.literal('minItems'),
	value: z.number(),
	message: z.string().optional(),
});

const MaxItemsRuleSchema = z.object({
	type: z.literal('maxItems'),
	value: z.number(),
	message: z.string().optional(),
});

const DateTimeRuleSchema = z.object({
	type: z.literal('datetime'),
	precision: z.number().optional(),
	offset: z.boolean().optional(),
	local: z.boolean().optional(),
	message: z.string().optional(),
});

const DateRuleSchema = z.object({
	type: z.literal('date'),
	message: z.string().optional(),
});

const TimeRuleSchema = z.object({
	type: z.literal('time'),
	precision: z.number().optional(),
	message: z.string().optional(),
});

const AsyncRuleSchema = z.object({
	type: z.literal('async'),
	url: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
	headers: z.record(z.string(), z.string()).optional(),
	extraPayload: z.record(z.string(), z.unknown()).optional(),
	expectedResponse: z
		.object({
			valid: z.boolean().optional(),
			success: z.boolean().optional(),
			message: z.string().optional(),
			error: z.string().optional(),
		})
		.optional(),
	message: z.string().optional(),
	dependencies: z.array(z.string()).optional(),
	debounce: z.number().optional(),
	cacheTTL: z.number().optional(),
	disableCache: z.boolean().optional(),
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
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

/**
 * Validation rule registration definition
 * @template TRule - Specific rule type for type-safe handler
 */
export interface ValidationRegistration<TRule extends { type: string } = { type: string } & Record<string, any>> {
	type: TRule['type'];
	category: 'string' | 'number' | 'array' | 'boolean' | 'date' | 'generic';
	/**
	 * Validation handler function
	 * @param rule - The validation rule configuration (typed to specific rule type)
	 * @param formData - Optional form data for cross-field validation (available in custom resolver)
	 * @returns Zod schema for validation
	 */
	handler: (rule: TRule, formData?: Record<string, any>) => StandardSchemaV1;
}

/**
 * Union of all possible validation registrations based on ValidationRule union.
 * This allows heterogeneous arrays (like defaultValidations) to be typed without 'any'.
 */
export type AnyValidationRegistration = ValidationRule extends infer T
	? T extends ValidationRule
		? ValidationRegistration<T>
		: never
	: never;

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
