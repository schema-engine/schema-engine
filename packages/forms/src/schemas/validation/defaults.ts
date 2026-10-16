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
import { createAsyncValidationHandler } from './async/handler.js';
import { relateValidation } from './relations.js';
import { isEmpty } from './empty.js';

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
export const defaultValidations: AnyValidationRegistration[] = [
	{
		type: 'required',
		category: 'generic',
		handler: (rule: RequiredRule) =>
			z.unknown().check(
				z.refine((val) => !isEmpty(val), {
					message: rule.message || 'Required',
				}),
			),
	},
	{
		type: 'minLength',
		category: 'string',
		handler: (rule: MinLengthRule) => z.string().check(z.minLength(rule.value, rule.message)),
	},
	{
		type: 'maxLength',
		category: 'string',
		handler: (rule: MaxLengthRule) => z.string().check(z.maxLength(rule.value, rule.message)),
	},
	{
		type: 'email',
		category: 'string',
		handler: (rule: EmailRule) => {
			const email = z.email(rule.message);
			return rule.pattern ? email.check(z.regex(new RegExp(rule.pattern), rule.message)) : email;
		},
	},
	{
		type: 'pattern',
		category: 'string',
		handler: (rule: PatternRule) => z.string().check(z.regex(new RegExp(rule.value), rule.message)),
	},
	{
		type: 'url',
		category: 'string',
		handler: (rule: UrlRule) =>
			z.url({
				error: rule.message,
				protocol: rule.protocol ? new RegExp(rule.protocol) : undefined,
				hostname: rule.hostname ? new RegExp(rule.hostname) : undefined,
			}),
	},
	{
		type: 'uuid',
		category: 'string',
		handler: (rule: UuidRule) => z.uuid({ version: rule.version, error: rule.message }),
	},
	{
		type: 'phone',
		category: 'string',
		handler: (rule: PhoneRule) => z.e164(rule.message || 'Please enter a valid phone number'),
	},
	{
		type: 'cidr',
		category: 'string',
		handler: (rule: CidrRule) => {
			const v4 = z.cidrv4(rule.message || 'Please enter a valid IPv4 CIDR');
			const v6 = z.cidrv6(rule.message || 'Please enter a valid IPv6 CIDR');

			if (rule.version === 'v4') return v4;
			if (rule.version === 'v6') return v6;
			return z.union([v4, v6]);
		},
	},
	{
		type: 'ipv4',
		category: 'string',
		handler: (rule: Ipv4Rule) => z.ipv4(rule.message || 'Invalid IPv4 address'),
	},
	{
		type: 'ipv6',
		category: 'string',
		handler: (rule: Ipv6Rule) => createIpv6Schema(rule.message),
	},

	{
		type: 'min',
		category: 'number',
		handler: (rule: MinRule) => z.number().check(z.gte(rule.value, rule.message)),
	},
	{
		type: 'max',
		category: 'number',
		handler: (rule: MaxRule) => z.number().check(z.lte(rule.value, rule.message)),
	},
	{
		type: 'minItems',
		category: 'array',
		handler: (rule: MinItemsRule) => z.array(z.unknown()).check(z.minLength(rule.value, rule.message)),
	},
	{
		type: 'maxItems',
		category: 'array',
		handler: (rule: MaxItemsRule) => z.array(z.unknown()).check(z.maxLength(rule.value, rule.message)),
	},
	{
		type: 'jwt',
		category: 'string',
		handler: (rule: JwtRule) => z.jwt({ alg: rule.alg, error: rule.message || 'Invalid JWT' }),
	},
	{
		type: 'hash',
		category: 'string',
		handler: (rule: HashRule) => z.hash(rule.algorithm, { error: rule.message || 'Invalid hash' }),
	},
	{
		type: 'base64',
		category: 'string',
		handler: (rule: Base64Rule) =>
			rule.urlSafe
				? z.base64url({ error: rule.message || 'Invalid Base64 URL' })
				: z.base64({ error: rule.message || 'Invalid Base64' }),
	},
	{
		type: 'cuid',
		category: 'string',
		handler: (rule: CuidRule) => z.cuid({ error: rule.message }),
	},
	{
		type: 'cuid2',
		category: 'string',
		handler: (rule: Cuid2Rule) => z.cuid2({ error: rule.message }),
	},
	{
		type: 'ulid',
		category: 'string',
		handler: (rule: UlidRule) => z.ulid({ error: rule.message }),
	},
	{
		type: 'hex',
		category: 'string',
		handler: (rule: HexRule) => z.hex({ error: rule.message }),
	},

	{
		type: 'datetime',
		category: 'date',
		handler: (rule: DateTimeRule) =>
			z.iso.datetime({
				error: rule.message || 'Please enter a valid datetime',
				precision: rule.precision,
				offset: rule.offset,
				local: rule.local,
			}),
	},

	{
		type: 'date',
		category: 'date',
		handler: (rule: DateRule) => z.iso.date({ error: rule.message || 'Please enter a valid date' }),
	},

	{
		type: 'time',
		category: 'date',
		handler: (rule: TimeRule) =>
			z.iso.time({
				error: rule.message || 'Please enter a valid time',
				precision: rule.precision,
			}),
	},

	{
		type: 'async',
		category: 'cross-field',
		dependsOn: (rule: AsyncRule) => rule.dependencies ?? [],
		handler: (rule: AsyncRule, context: ValidationContext) => createAsyncValidationHandler(rule, context),
	},

	relateValidation,
];
