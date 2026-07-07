import { z } from 'zod';
import { asyncValidationCache } from './cache';
import { debounce } from '@/lib/debounce';

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

	/** The URL endpoint to validate against (can include field name as path parameter) */
	url: string;

	/** HTTP method for the validation request (defaults to POST) */
	method?: AsyncValidationMethod;

	/** Additional headers to send with the request */
	headers?: Record<string, string>;

	/** Extra payload data to include in request (value and dependsOn are sent automatically) */
	extraPayload?: Record<string, unknown>;

	/** Expected successful response for validation (if not provided, uses standard success check) */
	expectedResponse?: AsyncValidationResponse;

	/** Field names this validation depends on for cross-field validation */
	dependencies?: string[];

	/** Error message to display when validation fails (server message takes priority) */
	message?: string;

	/** Debounce delay in milliseconds (delays validation execution) */
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
 * Resolves dependency values from form data.
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
 * Creates the validation request payload with value, dependencies, and extra payload.
 */
function createValidationPayload(
	value: unknown,
	dependsOn: Record<string, unknown>,
	extraPayload?: Record<string, unknown>,
): Record<string, unknown> {
	const payload: Record<string, unknown> = {
		value,
	};

	if (Object.keys(dependsOn).length > 0) {
		payload.dependsOn = dependsOn;
	}

	if (extraPayload) {
		Object.assign(payload, extraPayload);
	}

	return payload;
}

/**
 * Determines if validation is successful based on response data.
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
 * Extracts error message from validation response with proper priority.
 */
function getErrorMessage(data: unknown, fallbackMessage?: string): string {
	if (typeof data === 'object' && data !== null) {
		const obj = data as Record<string, unknown>;
		return (obj.message as string) || (obj.error as string) || fallbackMessage || 'Validation failed';
	}
	return fallbackMessage || 'Validation failed';
}

/**
 * Handles validation failure by adding issue to Zod context.
 */
function handleValidationFailure(ctx: z.RefinementCtx, message: string): void {
	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message,
	});
}

/**
 * Creates and caches error result, then adds issue to context.
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

/**
 * Creates a Zod async validation handler for server-side validation.
 * Includes debouncing, dependency resolution, and performance optimizations.
 */
export function createAsyncValidationHandler(rule: AsyncRule, formData?: Record<string, unknown>) {
	return z.any().superRefine(async (value: unknown, ctx) => {
		/** Skip validation for empty values to prevent unnecessary API calls */
		if (value === '' || value === null || value === undefined) {
			return;
		}

		const dependsOn = resolveDependencies(rule.dependencies, formData);

		/**
		 * Skip validation if any dependency field is empty.
		 * This ensures all required context is available before making API calls.
		 */
		if (rule.dependencies?.length) {
			const hasEmptyDependencies = rule.dependencies.some((dep) => {
				const depValue = formData?.[dep];
				return depValue === '' || depValue === null || depValue === undefined;
			});

			if (hasEmptyDependencies) {
				return;
			}
		}

		const payload = createValidationPayload(value, dependsOn, rule.extraPayload);

		/** Check cache first to avoid unnecessary delays for cached results */
		if (!rule.disableCache) {
			const cachedResult = asyncValidationCache.get(rule.url, payload) as CachedValidationResult | null;
			if (cachedResult !== null) {
				if (!cachedResult.valid && cachedResult.message) {
					handleValidationFailure(ctx, cachedResult.message);
				}
				return;
			}
		}

		/**
		 * Create unique debounce key excluding the changing value to ensure proper debouncing.
		 */
		const stablePayload = { dependsOn, ...rule.extraPayload };
		const debounceKey = `async-validation:${rule.url}:${JSON.stringify(stablePayload)}`;

		/** Core validation function that performs the HTTP request and processes the response */
		const performValidation = async () => {
			try {
				const method = rule.method ?? 'POST';
				const hasBody = method !== 'GET' && method !== 'HEAD';

				const response = await fetch(rule.url, {
					method,
					headers: {
						...(hasBody ? { 'Content-Type': 'application/json' } : {}),
						...rule.headers,
					},
					...(hasBody ? { body: JSON.stringify(payload) } : {}),
				});

				if (!response.ok) {
					const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
					handleErrorWithCache(
						ctx,
						asyncValidationCache,
						rule.url,
						payload,
						errorMessage,
						CACHE_TTL.HTTP_ERROR,
						rule.disableCache,
					);
					return;
				}

				const data = await response.json();
				const isValid = isValidationSuccessful(data, rule.expectedResponse);

				const cacheResult: CachedValidationResult = {
					valid: isValid,
					message: isValid ? undefined : getErrorMessage(data, rule.message),
				};

				if (!rule.disableCache) {
					asyncValidationCache.set(rule.url, payload, cacheResult, rule.cacheTTL);
				}

				if (!isValid && cacheResult.message) {
					handleValidationFailure(ctx, cacheResult.message);
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Async validation failed';
				handleErrorWithCache(
					ctx,
					asyncValidationCache,
					rule.url,
					payload,
					errorMessage,
					CACHE_TTL.NETWORK_ERROR,
					rule.disableCache,
				);
			}
		};

		/** Execute validation with optional debouncing based on rule configuration */
		if (rule.debounce && rule.debounce > 0) {
			await debounce(performValidation, rule.debounce, debounceKey);
		} else {
			await performValidation();
		}
	});
}
