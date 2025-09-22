import { z } from 'zod';
import type { ValidationRule, AsyncRule } from './types.js';
import type { ValidationRegistration } from './validation-registry.js';
import { createAsyncValidationHandler } from './async/index.js';

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

	/**
	 * Async validation handler for server-side validation
	 *
	 * Performs HTTP requests to validate field values against server-side logic.
	 * Supports dependency handling, custom headers, and flexible response formats.
	 * With form data access, dependencies are automatically resolved.
	 *
	 * @example
	 * ```typescript
	 * {
	 *   type: 'async',
	 *   url: '/api/validate-username',
	 *   method: 'POST',
	 *   debounce: 500,
	 *   dependencies: ['email'],
	 *   body: { dependsOn: '{{email}}' }, // Will be replaced with actual email value
	 *   expectedResponse: { valid: true }
	 * }
	 * ```
	 */
	{
		type: 'async',
		category: 'generic',
		handler: (rule: ValidationRule, formData?: Record<string, any>, fieldName?: string) => {
			return createAsyncValidationHandler(rule as AsyncRule, formData, fieldName);
		},
	},
];
