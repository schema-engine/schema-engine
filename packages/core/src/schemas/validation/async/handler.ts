import { z } from 'zod';
import { asyncValidationCache } from './cache';

/**
 * HTTP methods supported for async validation requests
 */
export type AsyncValidationMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Expected response format for validation success determination
 */
export interface AsyncValidationResponse {
	valid?: boolean;
	success?: boolean;
	message?: string;
	error?: string;
}

/**
 * Cached validation result structure
 */
interface CachedValidationResult {
	valid: boolean;
	message?: string;
}

/**
 * Interface for async validation rules with improved type safety
 */
export interface AsyncRule {
	/** Validation rule type identifier */
	type: 'async';

	/** The URL endpoint to validate against */
	url: string;

	/** HTTP method for the validation request (defaults to POST) */
	method?: AsyncValidationMethod;

	/** Additional headers to send with the request */
	headers?: Record<string, string>;

	/** Request body for the validation request */
	body?: Record<string, unknown>;

	/** Expected successful response for validation (if not provided, uses standard success check) */
	expectedResponse?: AsyncValidationResponse;

	/** Field names this validation depends on for cross-field validation */
	dependencies?: string[];

	/** Error message to display when validation fails (server message takes priority) */
	message?: string;

	/** Debounce delay in milliseconds (handled by form library) */
	debounce?: number;

	/** Cache TTL in milliseconds (defaults to 5 minutes) */
	cacheTTL?: number;

	/** Whether to disable caching for this validation */
	disableCache?: boolean;
}

/**
 * Standard cache TTL values for different error scenarios
 */
export const CACHE_TTL = {
	DEFAULT: 5 * 60 * 1000,
	HTTP_ERROR: 60 * 1000,
	NETWORK_ERROR: 30 * 1000,
} as const;

/**
 * Enhanced async validation handler with caching and dependency resolution
 *
 * @param rule - The async validation rule configuration
 * @param formData - Form data for dependency resolution
 * @returns Zod schema with async validation
 *
 * @example
 * ```typescript
 * {
 *   type: 'async',
 *   url: '/api/validate-field',
 *   method: 'POST',
 *   body: { field: 'username' },
 *   dependencies: ['email'],
 *   cacheTTL: 300000,
 *   expectedResponse: { valid: true }
 * }
 * ```
 */
export function createAsyncValidationHandler(rule: AsyncRule, formData?: Record<string, unknown>) {
	const asyncRule = rule as AsyncRule;

	return z.any().superRefine(async (value: unknown, ctx) => {
		const dependsOn = resolveDependencies(asyncRule.dependencies, formData);
		const processedBody = processRequestBody(asyncRule.body, dependsOn);
		const payload = { value, ...processedBody };

		/**
		 * Resolves dependency values from form data
		 *
		 * @param dependencies - Array of field names this validation depends on
		 * @param formData - Form data object containing field values
		 * @returns Object with dependency field names as keys and their values
		 */
		function resolveDependencies(
			dependencies: string[] | undefined,
			formData: Record<string, unknown> | undefined,
		): Record<string, unknown> {
			if (!dependencies?.length || !formData) {
				return {};
			}

			return Object.fromEntries(
				dependencies.filter((dep) => formData[dep] !== undefined).map((dep) => [dep, formData[dep]]),
			);
		}

		/**
		 * Processes request body and adds dependency data
		 *
		 * @param body - The base request body
		 * @param dependsOn - Resolved dependency values
		 * @returns Processed request body with dependencies added
		 */
		function processRequestBody(
			body: Record<string, unknown> | undefined,
			dependsOn: Record<string, unknown>,
		): Record<string, unknown> {
			const processed = { ...body };

			if (Object.keys(dependsOn).length > 0) {
				processed.dependsOn = dependsOn;
			}

			return processed;
		}

		/**
		 * Determines if validation is successful based on response data
		 *
		 * @param data - Response data from validation endpoint
		 * @param expectedResponse - Expected response format (optional)
		 * @returns True if validation passed, false otherwise
		 */
		function isValidationSuccessful(data: unknown, expectedResponse?: AsyncValidationResponse): boolean {
			if (expectedResponse) {
				return JSON.stringify(data) === JSON.stringify(expectedResponse);
			}

			if (typeof data === 'boolean') return data;
			if (typeof data === 'object' && data !== null) {
				const obj = data as Record<string, unknown>;
				return obj.success === true || obj.valid === true;
			}

			return false;
		}

		/**
		 * Extracts error message from validation response with proper priority
		 *
		 * @param data - Response data from validation endpoint
		 * @param fallbackMessage - Fallback message if none found in response
		 * @returns Error message string
		 */
		function getErrorMessage(data: unknown, fallbackMessage?: string): string {
			if (typeof data === 'object' && data !== null) {
				const obj = data as Record<string, unknown>;
				return (obj.message as string) || (obj.error as string) || fallbackMessage || 'Validation failed';
			}
			return fallbackMessage || 'Validation failed';
		}

		/**
		 * Handles validation failure by adding issue to Zod context
		 *
		 * @param ctx - Zod refinement context
		 * @param message - Error message to display
		 */
		function handleValidationFailure(ctx: z.RefinementCtx, message: string): void {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message,
			});
		}

		/**
		 * Creates and caches error result, then adds issue to context
		 *
		 * @param ctx - Zod refinement context
		 * @param cache - Cache instance to store error result
		 * @param url - Validation endpoint URL
		 * @param payload - Request payload for cache key generation
		 * @param message - Error message
		 * @param cacheTTL - Time to live for cached error
		 * @param disableCache - Whether to skip caching
		 */
		function handleErrorWithCache(
			ctx: z.RefinementCtx,
			cache: typeof asyncValidationCache,
			url: string,
			payload: Record<string, unknown>,
			message: string,
			cacheTTL: number,
			disableCache?: boolean,
		): void {
			const errorResult: CachedValidationResult = { valid: false, message };

			if (!disableCache) {
				cache.set(url, payload, errorResult, cacheTTL);
			}

			handleValidationFailure(ctx, message);
		}

		if (!asyncRule.disableCache) {
			const cachedResult = asyncValidationCache.get(asyncRule.url, payload) as CachedValidationResult | null;
			if (cachedResult !== null) {
				if (!cachedResult.valid && cachedResult.message) {
					handleValidationFailure(ctx, cachedResult.message);
				}
				return;
			}
		}

		try {
			const response = await fetch(asyncRule.url, {
				method: asyncRule.method || 'POST',
				headers: {
					'Content-Type': 'application/json',
					...asyncRule.headers,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
				handleErrorWithCache(
					ctx,
					asyncValidationCache,
					asyncRule.url,
					payload,
					errorMessage,
					CACHE_TTL.HTTP_ERROR,
					asyncRule.disableCache,
				);
				return;
			}

			const data = await response.json();
			const isValid = isValidationSuccessful(data, asyncRule.expectedResponse);

			const cacheResult: CachedValidationResult = {
				valid: isValid,
				message: isValid ? undefined : getErrorMessage(data, asyncRule.message),
			};

			if (!asyncRule.disableCache) {
				asyncValidationCache.set(asyncRule.url, payload, cacheResult, asyncRule.cacheTTL);
			}

			if (!isValid && cacheResult.message) {
				handleValidationFailure(ctx, cacheResult.message);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Async validation failed';
			handleErrorWithCache(
				ctx,
				asyncValidationCache,
				asyncRule.url,
				payload,
				errorMessage,
				CACHE_TTL.NETWORK_ERROR,
				asyncRule.disableCache,
			);
		}
	});
}
