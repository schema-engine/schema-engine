import { z } from 'zod';
import type {
	RequiredRule,
	MinLengthRule,
	MaxLengthRule,
	EmailRule,
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
	Base64Rule,
	HashRule,
	JwtRule,
	AnyValidationRegistration,
	AsyncRule,
} from './types.js';
import { createAsyncValidationHandler } from './async/handler.js';

/**
 * Built-in validation registrations
 * Maps validation rules to their Zod schema generators.
 */
export const defaultValidations: AnyValidationRegistration[] = [
	{
		type: 'required',
		category: 'generic',
		handler: (rule: RequiredRule) =>
			z.any().refine((val) => val !== undefined && val !== null && val !== '', {
				message: rule.message || 'Required',
			}),
	},
	{
		type: 'minLength',
		category: 'string',
		handler: (rule: MinLengthRule) => z.string().min(rule.value, rule.message),
	},
	{
		type: 'maxLength',
		category: 'string',
		handler: (rule: MaxLengthRule) => z.string().max(rule.value, rule.message),
	},
	{
		type: 'email',
		category: 'string',
		handler: (rule: EmailRule) => z.string().email(rule.message),
	},
	{
		type: 'pattern',
		category: 'string',
		handler: (rule: PatternRule) => z.string().regex(new RegExp(rule.value), rule.message),
	},
	{
		type: 'url',
		category: 'string',
		handler: (rule: UrlRule) => z.string().url(rule.message),
	},
	{
		type: 'uuid',
		category: 'string',
		handler: (rule: UuidRule) => z.string().uuid(rule.message),
	},
	{
		type: 'ipv4',
		category: 'string',
		handler: (rule: Ipv4Rule) =>
			z
				.string()
				.regex(
					/^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/,
					rule.message || 'Invalid IPv4 address',
				),
	},
	{
		type: 'ipv6',
		category: 'string',
		handler: (rule: Ipv6Rule) =>
			z
				.string()
				.regex(
					/^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$/,
					rule.message || 'Invalid IPv6 address',
				),
	},
	{
		type: 'min',
		category: 'number',
		handler: (rule: MinRule) => z.number().min(rule.value, rule.message),
	},
	{
		type: 'max',
		category: 'number',
		handler: (rule: MaxRule) => z.number().max(rule.value, rule.message),
	},
	{
		type: 'minItems',
		category: 'array',
		handler: (rule: MinItemsRule) => z.array(z.any()).min(rule.value, rule.message),
	},
	{
		type: 'maxItems',
		category: 'array',
		handler: (rule: MaxItemsRule) => z.array(z.any()).max(rule.value, rule.message),
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
		category: 'generic',
		handler: (rule: AsyncRule, formData?: Record<string, any>) => {
			return createAsyncValidationHandler(rule, formData);
		},
	},
];
