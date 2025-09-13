import { z } from 'zod';

/**
 * Serializable validation rule types
 */
export interface BaseValidationRule {
	type: string;
	message?: string;
}

export interface RequiredRule extends BaseValidationRule {
	type: 'required';
	message?: string;
}

export interface MinLengthRule extends BaseValidationRule {
	type: 'minLength';
	value: number;
	message?: string;
}

export interface MaxLengthRule extends BaseValidationRule {
	type: 'maxLength';
	value: number;
	message?: string;
}

export interface MinRule extends BaseValidationRule {
	type: 'min';
	value: number;
	message?: string;
}

export interface MaxRule extends BaseValidationRule {
	type: 'max';
	value: number;
	message?: string;
}

export interface EmailRule extends BaseValidationRule {
	type: 'email';
	pattern?: string;
	message?: string;
}

export interface PatternRule extends BaseValidationRule {
	type: 'pattern';
	/**
	 * Regex pattern string
	 */
	value: string;
	message?: string;
}

export interface UrlRule extends BaseValidationRule {
	type: 'url';
	/**
	 * Regex pattern for the URL protocol (e.g. "http", "https")
	 */
	protocol?: string;
	/**
	 * Regex pattern for the URL hostname (e.g. "example.com")
	 */
	hostname?: string;
	normalize?: boolean;
	message?: string;
}

export interface UuidRule extends BaseValidationRule {
	type: 'uuid';
	version?: 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8'; // UUID version
	message?: string;
}

export interface DateTimeRule extends BaseValidationRule {
	type: 'datetime';
	offset?: boolean;
	local?: boolean;
	/**
	 * Time precision (-1 for minutes, 0 for seconds, 1+ for sub-seconds)
	 */
	precision?: number;
	message?: string;
}

export interface DateRule extends BaseValidationRule {
	type: 'date';
	message?: string;
}

export interface TimeRule extends BaseValidationRule {
	type: 'time';
	offset?: boolean;
	local?: boolean;
	/**
	 * Time precision (-1 for minutes, 0 for seconds, 1+ for sub-seconds)
	 */
	precision?: number;
	message?: string;
}

export interface IpRule extends BaseValidationRule {
	type: 'ip';
	version: 'v4' | 'v6';
	message?: string;
}

export interface CidrRule extends BaseValidationRule {
	type: 'cidr';
	version: 'v4' | 'v6';
	message?: string;
}

export interface JwtRule extends BaseValidationRule {
	type: 'jwt';
	alg?: string;
	message?: string;
}

export interface HashRule extends BaseValidationRule {
	type: 'hash';
	algorithm: 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512';
	encoding?: 'hex' | 'base64' | 'base64url';
	message?: string;
}

export interface Base64Rule extends BaseValidationRule {
	type: 'base64';
	variant?: 'standard' | 'url';
	message?: string;
}

export interface StringFormatRule extends BaseValidationRule {
	type: 'format';
	format: 'emoji' | 'nanoid' | 'cuid' | 'cuid2' | 'ulid' | 'hex';
	message?: string;
}

export interface CustomRule extends BaseValidationRule {
	type: 'custom';
	/**
	 * Custom validation function name or identifier
	 */
	validator: string;
	message?: string;
}

/**
 * Union type for all validation rules
 */
export type ValidationRule =
	| RequiredRule
	| MinLengthRule
	| MaxLengthRule
	| MinRule
	| MaxRule
	| EmailRule
	| PatternRule
	| UrlRule
	| UuidRule
	| DateTimeRule
	| DateRule
	| TimeRule
	| IpRule
	| CidrRule
	| JwtRule
	| HashRule
	| Base64Rule
	| StringFormatRule
	| CustomRule;

export const RequiredRuleSchema = z.object({
	type: z.literal('required'),
	message: z.string().optional(),
});

export const MinLengthRuleSchema = z.object({
	type: z.literal('minLength'),
	value: z.number().min(0),
	message: z.string().optional(),
});

export const MaxLengthRuleSchema = z.object({
	type: z.literal('maxLength'),
	value: z.number().min(0),
	message: z.string().optional(),
});

export const MinRuleSchema = z.object({
	type: z.literal('min'),
	value: z.number(),
	message: z.string().optional(),
});

export const MaxRuleSchema = z.object({
	type: z.literal('max'),
	value: z.number(),
	message: z.string().optional(),
});

export const EmailRuleSchema = z.object({
	type: z.literal('email'),
	pattern: z.string().optional(),
	message: z.string().optional(),
});

export const PatternRuleSchema = z.object({
	type: z.literal('pattern'),
	value: z.string(),
	message: z.string().optional(),
});

export const UrlRuleSchema = z.object({
	type: z.literal('url'),
	protocol: z.string().optional(),
	hostname: z.string().optional(),
	normalize: z.boolean().optional(),
	message: z.string().optional(),
});

export const UuidRuleSchema = z.object({
	type: z.literal('uuid'),
	version: z.enum(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']).optional(),
	message: z.string().optional(),
});

export const DateTimeRuleSchema = z.object({
	type: z.literal('datetime'),
	offset: z.boolean().optional(),
	local: z.boolean().optional(),
	precision: z.number().optional(),
	message: z.string().optional(),
});

export const DateRuleSchema = z.object({
	type: z.literal('date'),
	message: z.string().optional(),
});

export const TimeRuleSchema = z.object({
	type: z.literal('time'),
	precision: z.number().optional(),
	message: z.string().optional(),
});

export const IpRuleSchema = z.object({
	type: z.literal('ip'),
	version: z.enum(['v4', 'v6']),
	message: z.string().optional(),
});

export const CidrRuleSchema = z.object({
	type: z.literal('cidr'),
	version: z.enum(['v4', 'v6']),
	message: z.string().optional(),
});

export const JwtRuleSchema = z.object({
	type: z.literal('jwt'),
	alg: z.string().optional(),
	message: z.string().optional(),
});

export const HashRuleSchema = z.object({
	type: z.literal('hash'),
	algorithm: z.enum(['md5', 'sha1', 'sha256', 'sha384', 'sha512']),
	encoding: z.enum(['hex', 'base64', 'base64url']).optional(),
	message: z.string().optional(),
});

export const Base64RuleSchema = z.object({
	type: z.literal('base64'),
	variant: z.enum(['standard', 'url']).optional(),
	message: z.string().optional(),
});

export const StringFormatRuleSchema = z.object({
	type: z.literal('format'),
	format: z.enum(['emoji', 'nanoid', 'cuid', 'cuid2', 'ulid', 'hex']),
	message: z.string().optional(),
});

export const CustomRuleSchema = z.object({
	type: z.literal('custom'),
	validator: z.string(),
	message: z.string().optional(),
});

export const ValidationRuleSchema = z.discriminatedUnion('type', [
	RequiredRuleSchema,
	MinLengthRuleSchema,
	MaxLengthRuleSchema,
	MinRuleSchema,
	MaxRuleSchema,
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
	CustomRuleSchema,
]);

export function isFieldRequired(rules?: ValidationRule[]): boolean {
	if (!rules || !Array.isArray(rules)) {
		return false;
	}

	return rules.some((rule: ValidationRule) => rule.type === 'required');
}

export class ValidationRegistry {
	private validators = new Map<string, (value: any) => boolean | string>();

	register(name: string, validator: (value: any) => boolean | string) {
		this.validators.set(name, validator);
	}

	get(name: string) {
		return this.validators.get(name);
	}

	has(name: string) {
		return this.validators.has(name);
	}
}

export const defaultValidationRegistry = new ValidationRegistry();

export function createZodSchema(
	fieldType: 'string' | 'number' | 'boolean' | 'array',
	rules: ValidationRule[] = [],
	optional = false,
): z.ZodTypeAny {
	let schema: z.ZodTypeAny;

	switch (fieldType) {
		case 'string':
			schema = z.string();
			break;
		case 'number':
			schema = z.number();
			break;
		case 'boolean':
			schema = z.boolean();
			break;
		case 'array':
			schema = z.array(z.any());
			break;
		default:
			schema = z.any();
	}

	for (const rule of rules) {
		switch (rule.type) {
			case 'required':
				if (fieldType === 'string') {
					schema = (schema as z.ZodString).min(1, rule.message || 'This field is required');
				} else if (fieldType === 'boolean') {
					schema = (schema as z.ZodBoolean).refine((val) => val === true, {
						message: rule.message || 'This field is required',
					});
				} else if (fieldType === 'array') {
					schema = (schema as z.ZodArray<any>).min(1, rule.message || 'This field is required');
				}
				break;

			case 'minLength':
				if (fieldType === 'string') {
					schema = (schema as z.ZodString).min(
						rule.value,
						rule.message || `Must be at least ${rule.value} characters`,
					);
				}
				break;

			case 'maxLength':
				if (fieldType === 'string') {
					schema = (schema as z.ZodString).max(
						rule.value,
						rule.message || `Must be no more than ${rule.value} characters`,
					);
				}
				break;

			case 'min':
				if (fieldType === 'number') {
					schema = (schema as z.ZodNumber).min(rule.value, rule.message || `Must be at least ${rule.value}`);
				}
				break;

			case 'max':
				if (fieldType === 'number') {
					schema = (schema as z.ZodNumber).max(
						rule.value,
						rule.message || `Must be no more than ${rule.value}`,
					);
				}
				break;

			case 'email':
				if (fieldType === 'string') {
					if (rule.pattern) {
						schema = z.email({
							pattern: new RegExp(rule.pattern),
						});
					} else {
						schema = z.email();
					}
				}
				break;

			case 'url':
				if (fieldType === 'string') {
					const urlOptions: any = {};
					if (rule.protocol) {
						urlOptions.protocol = new RegExp(rule.protocol);
					}
					if (rule.hostname) {
						urlOptions.hostname = new RegExp(rule.hostname);
					}

					if (Object.keys(urlOptions).length > 0) {
						schema = z.url(urlOptions);
					} else {
						schema = z.url();
					}
				}
				break;

			case 'uuid':
				if (fieldType === 'string') {
					if (rule.version) {
						schema = z.uuid({
							version: rule.version,
						});
					} else {
						schema = z.uuid();
					}
				}
				break;

			case 'datetime':
				if (fieldType === 'string') {
					const datetimeOptions: any = {};
					if (rule.offset !== undefined) {
						datetimeOptions.offset = rule.offset;
					}
					if (rule.local !== undefined) {
						datetimeOptions.local = rule.local;
					}
					if (rule.precision !== undefined) {
						datetimeOptions.precision = rule.precision;
					}

					if (Object.keys(datetimeOptions).length > 0) {
						schema = z.iso.datetime(datetimeOptions);
					} else {
						schema = z.iso.datetime();
					}
				}
				break;

			case 'date':
				if (fieldType === 'string') {
					schema = z.iso.date();
				}
				break;

			case 'time':
				if (fieldType === 'string') {
					if (rule.precision !== undefined) {
						schema = z.iso.time({
							precision: rule.precision,
						});
					} else {
						schema = z.iso.time();
					}
				}
				break;

			case 'ip':
				if (fieldType === 'string') {
					if (rule.version === 'v4') {
						schema = z.ipv4();
					} else if (rule.version === 'v6') {
						schema = z.ipv6();
					}
				}
				break;

			case 'cidr':
				if (fieldType === 'string') {
					if (rule.version === 'v4') {
						schema = z.cidrv4();
					} else if (rule.version === 'v6') {
						schema = z.cidrv6();
					}
				}
				break;

			case 'jwt':
				if (fieldType === 'string') {
					if (rule.alg) {
						schema = z.jwt({ alg: rule.alg });
					} else {
						schema = z.jwt();
					}
				}
				break;

			case 'hash':
				if (fieldType === 'string') {
					const hashOptions: any = {};
					if (rule.encoding) {
						hashOptions.enc = rule.encoding;
					}

					if (Object.keys(hashOptions).length > 0) {
						schema = z.hash(rule.algorithm, hashOptions);
					} else {
						schema = z.hash(rule.algorithm);
					}
				}
				break;

			case 'base64':
				if (fieldType === 'string') {
					if (rule.variant === 'url') {
						schema = z.base64url();
					} else {
						schema = z.base64();
					}
				}
				break;

			case 'format':
				if (fieldType === 'string') {
					switch (rule.format) {
						case 'emoji':
							schema = z.emoji();
							break;
						case 'nanoid':
							schema = z.nanoid();
							break;
						case 'cuid':
							schema = z.cuid();
							break;
						case 'cuid2':
							schema = z.cuid2();
							break;
						case 'ulid':
							schema = z.ulid();
							break;
						case 'hex':
							schema = z.hex();
							break;
					}
				}
				break;

			case 'pattern':
				if (fieldType === 'string') {
					schema = (schema as z.ZodString).regex(new RegExp(rule.value), rule.message || 'Invalid format');
				}
				break;

			case 'custom': {
				const validator = defaultValidationRegistry.get(rule.validator);
				if (validator) {
					schema = schema.refine(validator, {
						message: rule.message || 'Validation failed',
					});
				}
				break;
			}
		}
	}

	if (optional) {
		schema = schema.optional();
	}

	return schema;
}

/**
 * Generate Zod schema from form configuration
 */
export function generateFormSchema(elements: any[]): z.ZodObject<any> {
	const schemaFields: Record<string, z.ZodTypeAny> = {};

	function processField(field: any) {
		const { name, type, rules = [] } = field;

		let fieldType: 'string' | 'number' | 'boolean' | 'array';

		switch (type) {
			case 'input':
			case 'textarea':
			case 'select':
				fieldType = 'string';
				break;
			case 'number':
				fieldType = 'number';
				break;
			case 'checkbox':
			case 'switch':
				fieldType = 'boolean';
				break;
			case 'array':
				fieldType = 'array';
				break;
			default:
				fieldType = 'string';
		}

		const isRequired = isFieldRequired(rules);

		schemaFields[name] = createZodSchema(fieldType, rules, !isRequired);
	}

	for (const element of elements) {
		processField(element);

		if (element.type === 'array' && element.elements) {
			for (const childElement of element.elements) {
				processField(childElement);
			}
		}
	}

	return z.object(schemaFields);
}

/**
 * Default validation rule generators for common patterns
 */
export const ValidationPresets = {
	required: (message?: string): RequiredRule => ({
		type: 'required',
		message,
	}),

	email: (message?: string): EmailRule => ({
		type: 'email',
		message: message || 'Please enter a valid email address',
	}),

	minLength: (value: number, message?: string): MinLengthRule => ({
		type: 'minLength',
		value,
		message: message || `Must be at least ${value} characters`,
	}),

	maxLength: (value: number, message?: string): MaxLengthRule => ({
		type: 'maxLength',
		value,
		message: message || `Must be no more than ${value} characters`,
	}),

	min: (value: number, message?: string): MinRule => ({
		type: 'min',
		value,
		message: message || `Must be at least ${value}`,
	}),

	max: (value: number, message?: string): MaxRule => ({
		type: 'max',
		value,
		message: message || `Must be no more than ${value}`,
	}),

	pattern: (pattern: string, message?: string): PatternRule => ({
		type: 'pattern',
		value: pattern,
		message: message || 'Invalid format',
	}),

	url: (message?: string): UrlRule => ({
		type: 'url',
		message: message || 'Please enter a valid URL',
	}),

	uuid: (message?: string): UuidRule => ({
		type: 'uuid',
		message: message || 'Please enter a valid UUID',
	}),

	uuidv4: (message?: string): UuidRule => ({
		type: 'uuid',
		version: 'v4',
		message: message || 'Please enter a valid UUID v4',
	}),

	datetime: (message?: string): DateTimeRule => ({
		type: 'datetime',
		message: message || 'Please enter a valid ISO datetime',
	}),

	date: (message?: string): DateRule => ({
		type: 'date',
		message: message || 'Please enter a valid ISO date',
	}),

	time: (message?: string): TimeRule => ({
		type: 'time',
		message: message || 'Please enter a valid ISO time',
	}),

	ipv4: (message?: string): IpRule => ({
		type: 'ip',
		version: 'v4',
		message: message || 'Please enter a valid IPv4 address',
	}),

	ipv6: (message?: string): IpRule => ({
		type: 'ip',
		version: 'v6',
		message: message || 'Please enter a valid IPv6 address',
	}),

	jwt: (message?: string): JwtRule => ({
		type: 'jwt',
		message: message || 'Please enter a valid JWT',
	}),

	hash: (algorithm: 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512', message?: string): HashRule => ({
		type: 'hash',
		algorithm,
		message: message || `Please enter a valid ${algorithm} hash`,
	}),

	base64: (message?: string): Base64Rule => ({
		type: 'base64',
		message: message || 'Please enter a valid base64 string',
	}),

	base64url: (message?: string): Base64Rule => ({
		type: 'base64',
		variant: 'url',
		message: message || 'Please enter a valid base64url string',
	}),

	emoji: (message?: string): StringFormatRule => ({
		type: 'format',
		format: 'emoji',
		message: message || 'Please enter a valid emoji',
	}),

	nanoid: (message?: string): StringFormatRule => ({
		type: 'format',
		format: 'nanoid',
		message: message || 'Please enter a valid nanoid',
	}),

	cuid: (message?: string): StringFormatRule => ({
		type: 'format',
		format: 'cuid',
		message: message || 'Please enter a valid cuid',
	}),

	cuid2: (message?: string): StringFormatRule => ({
		type: 'format',
		format: 'cuid2',
		message: message || 'Please enter a valid cuid2',
	}),

	ulid: (message?: string): StringFormatRule => ({
		type: 'format',
		format: 'ulid',
		message: message || 'Please enter a valid ulid',
	}),

	hex: (message?: string): StringFormatRule => ({
		type: 'format',
		format: 'hex',
		message: message || 'Please enter a valid hex string',
	}),
};
