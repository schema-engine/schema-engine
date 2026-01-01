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

const IpRuleSchema = z.object({
	type: z.literal('ip'),
	version: z.enum(['v4', 'v6']).optional(),
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

const StringFormatRuleSchema = z.object({
	type: z.literal('format'),
	format: z.enum(['cuid', 'cuid2', 'ulid', 'hex']),
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
	IpRuleSchema,
	CidrRuleSchema,
	JwtRuleSchema,
	HashRuleSchema,
	Base64RuleSchema,
	StringFormatRuleSchema,
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
export type IpRule = z.infer<typeof IpRuleSchema>;
export type CidrRule = z.infer<typeof CidrRuleSchema>;
export type JwtRule = z.infer<typeof JwtRuleSchema>;
export type HashRule = z.infer<typeof HashRuleSchema>;
export type Base64Rule = z.infer<typeof Base64RuleSchema>;
export type StringFormatRule = z.infer<typeof StringFormatRuleSchema>;
export type AsyncRule = z.infer<typeof AsyncRuleSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
