import type {
	AsyncRule,
	Cuid2Rule,
	CuidRule,
	DateRule,
	DateTimeRule,
	EmailRule,
	HexRule,
	Ipv4Rule,
	Ipv6Rule,
	MaxItemsRule,
	MaxLengthRule,
	MaxRule,
	MinItemsRule,
	MinLengthRule,
	MinRule,
	PatternRule,
	RelateRule,
	RequiredRule,
	TimeRule,
	UlidRule,
	UrlRule,
	UuidRule,
} from './types.js';

export const ValidationPresets = {
	string: {
		required: (message?: string): RequiredRule => ({ $type: 'required', message }),
		email: (message?: string): EmailRule => ({
			$type: 'email',
			message,
		}),
		minLength: (value: number, message?: string): MinLengthRule => ({
			$type: 'minLength',
			value,
			message,
		}),
		maxLength: (value: number, message?: string): MaxLengthRule => ({
			$type: 'maxLength',
			value,
			message,
		}),
		pattern: (pattern: string, message?: string): PatternRule => ({
			$type: 'pattern',
			value: pattern,
			message,
		}),
		url: (message?: string): UrlRule => ({ $type: 'url', message }),
		uuid: (message?: string): UuidRule => ({ $type: 'uuid', message }),
		uuidv4: (message?: string): UuidRule => ({
			$type: 'uuid',
			version: 'v4',
			message,
		}),
		cuid: (message?: string): CuidRule => ({ $type: 'cuid', message }),
		cuid2: (message?: string): Cuid2Rule => ({ $type: 'cuid2', message }),
		ulid: (message?: string): UlidRule => ({ $type: 'ulid', message }),
		hex: (message?: string): HexRule => ({ $type: 'hex', message }),
	},
	number: {
		required: (message?: string): RequiredRule => ({ $type: 'required', message }),
		min: (value: number, message?: string): MinRule => ({
			$type: 'min',
			value,
			message,
		}),
		max: (value: number, message?: string): MaxRule => ({
			$type: 'max',
			value,
			message,
		}),
	},
	boolean: {
		required: (message?: string): RequiredRule => ({ $type: 'required', message }),
	},
	array: {
		required: (message?: string): RequiredRule => ({ $type: 'required', message }),
		minItems: (value: number, message?: string): MinItemsRule => ({
			$type: 'minItems',
			value,
			message,
		}),
		maxItems: (value: number, message?: string): MaxItemsRule => ({
			$type: 'maxItems',
			value,
			message,
		}),
		nonEmpty: (message?: string): MinItemsRule => ({
			$type: 'minItems',
			value: 1,
			message,
		}),
	},
	network: {
		ipv4: (message?: string): Ipv4Rule => ({
			$type: 'ipv4',
			message,
		}),
		ipv6: (message?: string): Ipv6Rule => ({
			$type: 'ipv6',
			message,
		}),
	},
	date: {
		datetime: (message?: string): DateTimeRule => ({
			$type: 'datetime',
			message,
		}),
		date: (message?: string): DateRule => ({
			$type: 'date',
			message,
		}),
		time: (message?: string): TimeRule => ({
			$type: 'time',
			message,
		}),
	},
	/**
	 * Authoring sugar over the generic `relate` rule.
	 *
	 * @remarks
	 * Each returns a plain rule object, so a form authored in TypeScript and one
	 * round-tripped through JSON produce the same configuration. References
	 * resolve relative to the field declaring the rule.
	 */
	relate: {
		matches: (field: string, message?: string): RelateRule => ({
			$type: 'relate',
			fields: [field],
			assert: 'allEqual',
			includeSelf: true,
			as: 'auto',
			skipWhenIncomplete: true,
			message,
		}),
		after: (field: string, message?: string): RelateRule => ({
			$type: 'relate',
			fields: [field],
			assert: 'descending',
			includeSelf: true,
			as: 'date',
			skipWhenIncomplete: true,
			message,
		}),
		before: (field: string, message?: string): RelateRule => ({
			$type: 'relate',
			fields: [field],
			assert: 'ascending',
			includeSelf: true,
			as: 'date',
			skipWhenIncomplete: true,
			message,
		}),
		atLeastOneOf: (fields: string[], message?: string): RelateRule => ({
			$type: 'relate',
			fields,
			assert: 'atLeastOne',
			includeSelf: false,
			as: 'auto',
			skipWhenIncomplete: true,
			message,
		}),
		mutuallyExclusive: (fields: string[], message?: string): RelateRule => ({
			$type: 'relate',
			fields,
			assert: 'exactlyOne',
			includeSelf: false,
			as: 'auto',
			skipWhenIncomplete: true,
			message,
		}),
		allOrNone: (fields: string[], message?: string): RelateRule => ({
			$type: 'relate',
			fields,
			assert: 'allOrNone',
			includeSelf: false,
			as: 'auto',
			skipWhenIncomplete: true,
			message,
		}),
	},
	custom: {
		async: (
			url: string,
			options?: {
				method?: NonNullable<AsyncRule['method']>;
				headers?: AsyncRule['headers'];
				extraPayload?: AsyncRule['extraPayload'];
				expectedResponse?: AsyncRule['expectedResponse'];
				message?: string;
				dependencies?: string[];
			},
		): AsyncRule => ({
			$type: 'async',
			url,
			method: options?.method || 'POST',
			headers: options?.headers,
			extraPayload: options?.extraPayload,
			expectedResponse: options?.expectedResponse,
			message: options?.message,
			dependencies: options?.dependencies,
		}),
	},
} as const;
