export interface BaseValidationRule {
	type: string;
	message?: string;
}

export interface RequiredRule extends BaseValidationRule {
	type: 'required';
	message?: string;
}

export interface MinItemsRule extends BaseValidationRule {
	type: 'minItems';
	value: number;
	message?: string;
}

export interface MaxItemsRule extends BaseValidationRule {
	type: 'maxItems';
	value: number;
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
	value: string;
	message?: string;
}

export interface UrlRule extends BaseValidationRule {
	type: 'url';
	protocol?: string;
	hostname?: string;
	message?: string;
}

export interface UuidRule extends BaseValidationRule {
	type: 'uuid';
	version?: 'v1' | 'v2' | 'v3' | 'v4' | 'v5';
	message?: string;
}

export interface DateTimeRule extends BaseValidationRule {
	type: 'datetime';
	precision?: number;
	offset?: boolean;
	local?: boolean;
	message?: string;
}

export interface DateRule extends BaseValidationRule {
	type: 'date';
	message?: string;
}

export interface TimeRule extends BaseValidationRule {
	type: 'time';
	precision?: number;
	message?: string;
}

export interface IpRule extends BaseValidationRule {
	type: 'ip';
	version?: 'v4' | 'v6';
	message?: string;
}

export interface CidrRule extends BaseValidationRule {
	type: 'cidr';
	version?: 'v4' | 'v6';
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
	message?: string;
}

export interface Base64Rule extends BaseValidationRule {
	type: 'base64';
	urlSafe?: boolean;
	message?: string;
}

export interface StringFormatRule extends BaseValidationRule {
	type: 'format';
	format: 'cuid' | 'cuid2' | 'ulid' | 'hex';
	message?: string;
}

export interface AsyncRule extends BaseValidationRule {
	type: 'async';
	url: string;
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	headers?: Record<string, string>;
	extraPayload?: Record<string, unknown>;
	expectedResponse?: {
		valid?: boolean;
		success?: boolean;
		message?: string;
		error?: string;
	};
	message?: string;
	/**
	 * Field names this validation depends on for cross-field validation.
	 * Async validation will be skipped if any dependency field is empty,
	 * ensuring all required context is available before making API calls.
	 */
	dependencies?: string[];
	debounce?: number;
	cacheTTL?: number;
	disableCache?: boolean;
}

/**
 * Union type for all validation rules
 */
export type ValidationRule =
	| RequiredRule
	| MinItemsRule
	| MaxItemsRule
	| MinLengthRule
	| MaxLengthRule
	| MinRule
	| MaxRule
	| EmailRule
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
	| PatternRule
	| AsyncRule;

import { z } from 'zod';

/**
 * Zod schema for runtime validation of ValidationRule objects
 */
export const ValidationRuleSchema = z.union([
	z.object({
		type: z.literal('required'),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('minLength'),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('maxLength'),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('min'),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('max'),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('minItems'),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('maxItems'),
		value: z.number(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('email'),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('url'),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('uuid'),
		version: z.enum(['v1', 'v3', 'v4', 'v5']).optional(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('ip'),
		version: z.enum(['v4', 'v6']).optional(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('datetime'),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('date'),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('time'),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('pattern'),
		value: z.string(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('async'),
		url: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
		headers: z.record(z.string(), z.string()).optional(),
		body: z.record(z.string(), z.any()).optional(),
		expectedResponse: z.record(z.string(), z.any()).optional(),
		dependencies: z.array(z.string()).optional(),
		debounce: z.number().optional(),
		cacheTTL: z.number().optional(),
		disableCache: z.boolean().optional(),
		message: z.string().optional(),
	}),
	z.object({
		type: z.literal('base64'),
		message: z.string().optional(),
	}),
]);
