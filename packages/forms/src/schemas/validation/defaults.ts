import * as z from 'zod/mini';
import type {
	RequiredRule,
	MinLengthRule,
	MaxLengthRule,
	EmailRule,
	PatternRule,
	UrlRule,
	UuidRule,
	CidrRule,
	PhoneRule,
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
	Base64Rule,
	HashRule,
	JwtRule,
	AnyValidationRegistration,
	AsyncRule,
	ValidationContext,
} from './types.js';
import {
	AsyncRuleSchema,
	Base64RuleSchema,
	CidrRuleSchema,
	Cuid2RuleSchema,
	CuidRuleSchema,
	DateRuleSchema,
	DateTimeRuleSchema,
	EmailRuleSchema,
	HashRuleSchema,
	HexRuleSchema,
	Ipv4RuleSchema,
	Ipv6RuleSchema,
	JwtRuleSchema,
	MaxItemsRuleSchema,
	MaxLengthRuleSchema,
	MaxRuleSchema,
	MinItemsRuleSchema,
	MinLengthRuleSchema,
	MinRuleSchema,
	PatternRuleSchema,
	PhoneRuleSchema,
	RequiredRuleSchema,
	TimeRuleSchema,
	UlidRuleSchema,
	UrlRuleSchema,
	UuidRuleSchema,
} from './types.js';
import { createAsyncValidationHandler } from './async/handler.js';
import { relateValidation } from './relations.js';
import { isEmpty } from './empty.js';

/** The options that are set, or `undefined` when none is. */
function definedParams(options: Record<string, unknown>): Record<string, unknown> | undefined {
	const set = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
	return Object.keys(set).length === 0 ? undefined : set;
}

const ipv6ZonePattern = /^[0-9a-zA-Z]+$/;

/**
 * Validates IPv6 addresses through Zod Mini while retaining support for the
 * interface zone suffix accepted by the validation contract.
 *
 * @remarks Zod's native IPv6 format validates the address portion but does
 * not accept RFC 4007-style suffixes such as `%eth0`. The suffix is checked
 * separately so the parser remains Zod Mini-owned without dropping existing
 * form configuration behavior.
 */
const createIpv6Schema = (message?: string): z.ZodMiniType => {
	const errorMessage = message || 'Invalid IPv6 address';
	const addressSchema = z.ipv6(errorMessage);

	return z.string().check(
		z.refine((value) => {
			const zoneSeparator = value.indexOf('%');
			const address = zoneSeparator === -1 ? value : value.slice(0, zoneSeparator);
			const zone = zoneSeparator === -1 ? undefined : value.slice(zoneSeparator + 1);

			return z.safeParse(addressSchema, address).success && (zone === undefined || ipv6ZonePattern.test(zone));
		}, errorMessage),
	);
};

/**
 * Built-in validation registrations
 * Maps validation rules to their Zod Mini schema generators.
 */
export const defaultValidations: readonly AnyValidationRegistration[] = [
	{
		$type: 'required',
		schema: RequiredRuleSchema,
		metadata: { name: 'Required', description: 'The field must have a value.' },
		category: 'generic',
		handler: (rule: RequiredRule) =>
			z.unknown().check(
				z.refine((val) => !isEmpty(val), {
					message: rule.message || 'Required',
				}),
			),
	},
	{
		$type: 'minLength',
		schema: MinLengthRuleSchema,
		metadata: { name: 'Minimum length', description: 'The text has at least `value` characters.' },
		category: 'string',
		params: (rule: MinLengthRule) => ({ minLength: rule.value }),
		handler: (rule: MinLengthRule) => z.string().check(z.minLength(rule.value, rule.message)),
	},
	{
		$type: 'maxLength',
		schema: MaxLengthRuleSchema,
		metadata: { name: 'Maximum length', description: 'The text has at most `value` characters.' },
		category: 'string',
		params: (rule: MaxLengthRule) => ({ maxLength: rule.value }),
		handler: (rule: MaxLengthRule) => z.string().check(z.maxLength(rule.value, rule.message)),
	},
	{
		$type: 'email',
		schema: EmailRuleSchema,
		metadata: { name: 'Email', description: 'The text is an email address.' },
		category: 'string',
		params: (rule: EmailRule) => (rule.pattern === undefined ? undefined : { pattern: rule.pattern }),
		handler: (rule: EmailRule) => {
			const email = z.email(rule.message);
			return rule.pattern ? email.check(z.regex(new RegExp(rule.pattern), rule.message)) : email;
		},
	},
	{
		$type: 'pattern',
		schema: PatternRuleSchema,
		metadata: { name: 'Pattern', description: 'The text matches the regular expression `value`.' },
		category: 'string',
		params: (rule: PatternRule) => ({ pattern: rule.value }),
		handler: (rule: PatternRule) => z.string().check(z.regex(new RegExp(rule.value), rule.message)),
	},
	{
		$type: 'url',
		schema: UrlRuleSchema,
		metadata: { name: 'URL', description: 'The text is a URL, optionally limited by protocol and hostname.' },
		category: 'string',
		params: (rule: UrlRule) => definedParams({ protocol: rule.protocol, hostname: rule.hostname }),
		handler: (rule: UrlRule) =>
			z.url({
				error: rule.message,
				protocol: rule.protocol ? new RegExp(rule.protocol) : undefined,
				hostname: rule.hostname ? new RegExp(rule.hostname) : undefined,
			}),
	},
	{
		$type: 'uuid',
		schema: UuidRuleSchema,
		metadata: { name: 'UUID', description: 'The text is a UUID, optionally of one version.' },
		category: 'string',
		params: (rule: UuidRule) => definedParams({ version: rule.version }),
		handler: (rule: UuidRule) => z.uuid({ version: rule.version, error: rule.message }),
	},
	{
		$type: 'phone',
		schema: PhoneRuleSchema,
		metadata: { name: 'Phone', description: 'The text is an E.164 phone number.' },
		category: 'string',
		handler: (rule: PhoneRule) => z.e164(rule.message || 'Please enter a valid phone number'),
	},
	{
		$type: 'cidr',
		schema: CidrRuleSchema,
		metadata: { name: 'CIDR', description: 'The text is an IPv4 or IPv6 CIDR range.' },
		category: 'string',
		params: (rule: CidrRule) => definedParams({ version: rule.version }),
		handler: (rule: CidrRule) => {
			const v4 = z.cidrv4(rule.message || 'Please enter a valid IPv4 CIDR');
			const v6 = z.cidrv6(rule.message || 'Please enter a valid IPv6 CIDR');

			if (rule.version === 'v4') return v4;
			if (rule.version === 'v6') return v6;
			return z.union([v4, v6]);
		},
	},
	{
		$type: 'ipv4',
		schema: Ipv4RuleSchema,
		metadata: { name: 'IPv4', description: 'The text is an IPv4 address.' },
		category: 'string',
		handler: (rule: Ipv4Rule) => z.ipv4(rule.message || 'Invalid IPv4 address'),
	},
	{
		$type: 'ipv6',
		schema: Ipv6RuleSchema,
		metadata: { name: 'IPv6', description: 'The text is an IPv6 address, with an optional zone suffix.' },
		category: 'string',
		handler: (rule: Ipv6Rule) => createIpv6Schema(rule.message),
	},

	{
		$type: 'min',
		schema: MinRuleSchema,
		metadata: { name: 'Minimum', description: 'The number is at least `value`.' },
		category: 'number',
		params: (rule: MinRule) => ({ min: rule.value }),
		handler: (rule: MinRule) => z.number().check(z.gte(rule.value, rule.message)),
	},
	{
		$type: 'max',
		schema: MaxRuleSchema,
		metadata: { name: 'Maximum', description: 'The number is at most `value`.' },
		category: 'number',
		params: (rule: MaxRule) => ({ max: rule.value }),
		handler: (rule: MaxRule) => z.number().check(z.lte(rule.value, rule.message)),
	},
	{
		$type: 'minItems',
		schema: MinItemsRuleSchema,
		metadata: { name: 'Minimum items', description: 'The list has at least `value` items.' },
		category: 'array',
		params: (rule: MinItemsRule) => ({ minItems: rule.value }),
		handler: (rule: MinItemsRule) => z.array(z.unknown()).check(z.minLength(rule.value, rule.message)),
	},
	{
		$type: 'maxItems',
		schema: MaxItemsRuleSchema,
		metadata: { name: 'Maximum items', description: 'The list has at most `value` items.' },
		category: 'array',
		params: (rule: MaxItemsRule) => ({ maxItems: rule.value }),
		handler: (rule: MaxItemsRule) => z.array(z.unknown()).check(z.maxLength(rule.value, rule.message)),
	},
	{
		$type: 'jwt',
		schema: JwtRuleSchema,
		metadata: { name: 'JWT', description: 'The text is a JSON Web Token.' },
		category: 'string',
		params: (rule: JwtRule) => definedParams({ alg: rule.alg }),
		handler: (rule: JwtRule) => z.jwt({ alg: rule.alg, error: rule.message || 'Invalid JWT' }),
	},
	{
		$type: 'hash',
		schema: HashRuleSchema,
		metadata: { name: 'Hash', description: 'The text is a hex digest of the chosen algorithm.' },
		category: 'string',
		params: (rule: HashRule) => ({ algorithm: rule.algorithm }),
		handler: (rule: HashRule) => z.hash(rule.algorithm, { error: rule.message || 'Invalid hash' }),
	},
	{
		$type: 'base64',
		schema: Base64RuleSchema,
		metadata: { name: 'Base64', description: 'The text is Base64 or Base64URL encoded.' },
		category: 'string',
		params: (rule: Base64Rule) => definedParams({ urlSafe: rule.urlSafe }),
		handler: (rule: Base64Rule) =>
			rule.urlSafe
				? z.base64url({ error: rule.message || 'Invalid Base64 URL' })
				: z.base64({ error: rule.message || 'Invalid Base64' }),
	},
	{
		$type: 'cuid',
		schema: CuidRuleSchema,
		metadata: { name: 'CUID', description: 'The text is a CUID.' },
		category: 'string',
		handler: (rule: CuidRule) => z.cuid({ error: rule.message }),
	},
	{
		$type: 'cuid2',
		schema: Cuid2RuleSchema,
		metadata: { name: 'CUID2', description: 'The text is a CUID2.' },
		category: 'string',
		handler: (rule: Cuid2Rule) => z.cuid2({ error: rule.message }),
	},
	{
		$type: 'ulid',
		schema: UlidRuleSchema,
		metadata: { name: 'ULID', description: 'The text is a ULID.' },
		category: 'string',
		handler: (rule: UlidRule) => z.ulid({ error: rule.message }),
	},
	{
		$type: 'hex',
		schema: HexRuleSchema,
		metadata: { name: 'Hex', description: 'The text is a hexadecimal string.' },
		category: 'string',
		handler: (rule: HexRule) => z.hex({ error: rule.message }),
	},

	{
		$type: 'datetime',
		schema: DateTimeRuleSchema,
		metadata: { name: 'Datetime', description: 'The text is an ISO 8601 datetime.' },
		category: 'date',
		params: (rule: DateTimeRule) =>
			definedParams({ precision: rule.precision, offset: rule.offset, local: rule.local }),
		handler: (rule: DateTimeRule) =>
			z.iso.datetime({
				error: rule.message || 'Please enter a valid datetime',
				precision: rule.precision,
				offset: rule.offset,
				local: rule.local,
			}),
	},

	{
		$type: 'date',
		schema: DateRuleSchema,
		metadata: { name: 'Date', description: 'The text is an ISO 8601 date.' },
		category: 'date',
		handler: (rule: DateRule) => z.iso.date({ error: rule.message || 'Please enter a valid date' }),
	},

	{
		$type: 'time',
		schema: TimeRuleSchema,
		metadata: { name: 'Time', description: 'The text is an ISO 8601 time.' },
		category: 'date',
		params: (rule: TimeRule) => definedParams({ precision: rule.precision }),
		handler: (rule: TimeRule) =>
			z.iso.time({
				error: rule.message || 'Please enter a valid time',
				precision: rule.precision,
			}),
	},

	{
		$type: 'async',
		schema: AsyncRuleSchema,
		metadata: { name: 'Async', description: 'The value is checked by a request to a server endpoint.' },
		category: 'cross-field',
		dependsOn: (rule: AsyncRule) => rule.dependencies ?? [],
		message: (rule: AsyncRule, reported: string | undefined) => reported ?? rule.message,
		handler: (rule: AsyncRule, context: ValidationContext) => createAsyncValidationHandler(rule, context),
	},

	relateValidation,
];
