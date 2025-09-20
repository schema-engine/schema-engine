import { z } from 'zod';
import type { ValidationRule, AsyncRule } from './types.js';
import type { ValidationRegistration } from './validation-registry.js';

/**
 * Default validation registrations for the ValidationRegistry
 */
export const defaultValidations: ValidationRegistration[] = [
	{
		type: 'required',
		category: 'generic',
		handler: (rule: ValidationRule) => z.string().min(1, rule.message || 'This field is required'),
	},

	{
		type: 'email',
		category: 'string',
		handler: (rule: ValidationRule) => z.string().email(rule.message || 'Please enter a valid email address'),
	},

	{
		type: 'minLength',
		category: 'string',
		handler: (rule: ValidationRule) => {
			const lengthRule = rule as any;
			return z.string().min(lengthRule.value, rule.message || `Must be at least ${lengthRule.value} characters`);
		},
	},

	{
		type: 'maxLength',
		category: 'string',
		handler: (rule: ValidationRule) => {
			const lengthRule = rule as any;
			return z
				.string()
				.max(lengthRule.value, rule.message || `Must be no more than ${lengthRule.value} characters`);
		},
	},

	{
		type: 'pattern',
		category: 'string',
		handler: (rule: ValidationRule) => {
			const patternRule = rule as any;
			return z.string().regex(new RegExp(patternRule.value), rule.message || 'Invalid format');
		},
	},

	{
		type: 'url',
		category: 'string',
		handler: (rule: ValidationRule) => z.string().url(rule.message || 'Please enter a valid URL'),
	},

	{
		type: 'uuid',
		category: 'string',
		handler: (rule: ValidationRule) => {
			const uuidRule = rule as any;
			return uuidRule.version ? z.string().uuid({ version: uuidRule.version }) : z.string().uuid();
		},
	},

	{
		type: 'min',
		category: 'number',
		handler: (rule: ValidationRule) => {
			const minRule = rule as any;
			return z.number().min(minRule.value, rule.message || `Must be at least ${minRule.value}`);
		},
	},

	{
		type: 'max',
		category: 'number',
		handler: (rule: ValidationRule) => {
			const maxRule = rule as any;
			return z.number().max(maxRule.value, rule.message || `Must be no more than ${maxRule.value}`);
		},
	},

	{
		type: 'minItems',
		category: 'array',
		handler: (rule: ValidationRule) => {
			const minItemsRule = rule as any;
			return z
				.array(z.any())
				.min(minItemsRule.value, rule.message || `Must have at least ${minItemsRule.value} items`);
		},
	},

	{
		type: 'maxItems',
		category: 'array',
		handler: (rule: ValidationRule) => {
			const maxItemsRule = rule as any;
			return z
				.array(z.any())
				.max(maxItemsRule.value, rule.message || `Must have no more than ${maxItemsRule.value} items`);
		},
	},

	{
		type: 'ip',
		category: 'string',
		handler: (rule: ValidationRule) => {
			const ipRule = rule as any;
			const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
			const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
			const pattern = ipRule.version === 'v4' ? ipv4Regex : ipv6Regex;
			return z.string().regex(pattern, rule.message || `Please enter a valid ${ipRule.version || 'IP'} address`);
		},
	},

	{
		type: 'datetime',
		category: 'date',
		handler: () => z.string().datetime(),
	},

	{
		type: 'date',
		category: 'date',
		handler: () => z.string().date(),
	},

	{
		type: 'time',
		category: 'date',
		handler: () => z.string().time(),
	},

	{
		type: 'async',
		category: 'generic',
		handler: (rule: ValidationRule) => {
			const asyncRule = rule as AsyncRule;
			return z.any().refine(
				async (value: any) => {
					const payload: any = { value };

					if (asyncRule.dependencies?.length) {
						// Implementation depends on form context - dependencies would be injected at form level
					}

					const response = await fetch(asyncRule.url, {
						method: asyncRule.method || 'POST',
						headers: {
							'Content-Type': 'application/json',
							...asyncRule.headers,
						},
						body: asyncRule.body
							? JSON.stringify({ ...payload, ...asyncRule.body })
							: JSON.stringify(payload),
					});

					if (!response.ok) {
						return false;
					}

					const data = await response.json();

					if (data.error || data.message) {
						throw new Error(data.error || data.message);
					}

					if (asyncRule.expectedResponse) {
						return JSON.stringify(data) === JSON.stringify(asyncRule.expectedResponse);
					}

					return data === true || data.success === true || data.valid === true;
				},
				{
					message: asyncRule.message || 'Validation failed',
				},
			);
		},
	},
];
