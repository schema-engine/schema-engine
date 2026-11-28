import * as z from 'zod/mini';
import { asyncValidationCache } from './cache.js';
import type { AsyncRule, ValidationContext } from '../types.js';
import { isEmpty } from '../empty.js';
import { REPORTED_TEXT, ValidationSuperseded, ValidationUnavailable } from '../errors.js';

/**
 * HTTP methods supported for async validation requests
 */
export type AsyncValidationMethod = NonNullable<AsyncRule['method']>;

/**
 * Expected response format for validation success determination
 */
export type AsyncValidationResponse = NonNullable<AsyncRule['expectedResponse']>;

/**
 * Cached validation result structure
 */
interface CachedValidationResult {
	valid: boolean;
	message?: string;
}

/**
 * Cache TTL for an answer of the service; an outage is never cached
 */
export const CACHE_TTL = {
	DEFAULT: 5 * 60 * 1000,
} as const;

/**
 * Resolves dependency values through the field's validation context.
 *
 * @remarks
 * Dependencies are field *references*, so they resolve like any other: a bare
 * name is a sibling and a dotted name is absolute. Reading them off a flat map
 * instead — as this did — dropped every nested dependency and pinned every
 * array-row dependency to row zero.
 */
function resolveDependencies(dependencies: string[] | undefined, context: ValidationContext): Record<string, unknown> {
	if (!dependencies?.length) {
		return {};
	}

	return Object.fromEntries(
		dependencies.map((dep) => [dep, context.resolve(dep)] as const).filter(([, value]) => value !== undefined),
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

/** Whether two answers hold the same data, whatever the order of their keys. */
function sameData(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameData(item, b[i]))
		);
	}
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => Object.hasOwn(right, key) && sameData(left[key], right[key]))
	);
}

/**
 * Whether the answer of the endpoint says the value is valid.
 *
 * @remarks
 * With `expectedResponse` the answer must equal it structurally. Without, an answer is a boolean, or an
 * object whose `valid` (else `success`) is a boolean. Anything else is no answer about the value: it throws
 * `ValidationUnavailable`, so it is never a field error and never cached.
 */
function isValidationSuccessful(data: unknown, expectedResponse?: AsyncValidationResponse): boolean {
	if (expectedResponse) return sameData(data, expectedResponse);
	if (typeof data === 'boolean') return data;
	if (typeof data === 'object' && data !== null) {
		const { valid, success } = data as Record<string, unknown>;
		if (typeof valid === 'boolean') return valid;
		if (typeof success === 'boolean') return success;
	}
	throw new ValidationUnavailable();
}

/**
 * Extracts error message from validation response with proper priority.
 */
function getErrorMessage(data: unknown, fallbackMessage?: string): string | undefined {
	if (typeof data === 'object' && data !== null) {
		const obj = data as Record<string, unknown>;
		return (obj.message as string) || (obj.error as string) || fallbackMessage;
	}
	return fallbackMessage;
}

/**
 * Handles validation failure by adding an issue to the Zod Mini context.
 */
function handleValidationFailure(ctx: z.core.$RefinementCtx, text: string | undefined): void {
	ctx.addIssue({
		code: 'custom',
		...(text === undefined ? {} : { params: { [REPORTED_TEXT]: text } }),
	});
}

/**
 * Creates a Zod Mini async validation handler for server-side validation.
 * Includes debouncing, dependency resolution, and performance optimizations.
 */
export function createAsyncValidationHandler(rule: AsyncRule, context: ValidationContext) {
	return z.unknown().check(
		z.superRefine(async (value: unknown, ctx) => {
			if (isEmpty(value)) {
				return;
			}

			const dependsOn = resolveDependencies(rule.dependencies, context);

			/**
			 * Skip validation if any dependency field is empty.
			 * This ensures all required context is available before making API calls.
			 */
			if (rule.dependencies?.length) {
				const hasEmptyDependencies = rule.dependencies.some((dep) => {
					const depValue = context.resolve(dep);
					return isEmpty(depValue);
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
					if (!cachedResult.valid) {
						handleValidationFailure(ctx, cachedResult.message);
					}
					return;
				}
			}

			/**
			 * Create unique debounce key excluding the changing value to ensure proper debouncing.
			 */
			const stablePayload = { dependsOn, ...rule.extraPayload };
			const debounceKey = `async-validation:${context.fieldPath}:${rule.url}:${JSON.stringify(stablePayload)}`;

			/** Core validation function that performs the HTTP request and processes the response */
			const performValidation = async (): Promise<CachedValidationResult> => {
				const method = rule.method ?? 'POST';
				const hasBody = method !== 'GET';
				let data: unknown;
				try {
					const response = await context.fetch(rule.url, {
						method,
						headers: {
							...(hasBody ? { 'Content-Type': 'application/json' } : {}),
							...rule.headers,
						},
						...(hasBody ? { body: JSON.stringify(payload) } : {}),
					});
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					data = await response.json();
				} catch (cause) {
					throw new ValidationUnavailable({ cause });
				}

				const isValid = isValidationSuccessful(data, rule.expectedResponse);
				const cacheResult: CachedValidationResult = {
					valid: isValid,
					message: isValid ? undefined : getErrorMessage(data, rule.message),
				};

				if (!rule.disableCache) {
					asyncValidationCache.set(rule.url, payload, cacheResult, rule.cacheTTL);
				}

				return cacheResult;
			};

			/** Execute validation with optional debouncing based on rule configuration */
			let result: CachedValidationResult;
			if (rule.debounce && rule.debounce > 0) {
				const outcome = await context.debounceScope.debounce(
					performValidation,
					rule.debounce,
					debounceKey,
					JSON.stringify(value),
				);
				if (outcome.status !== 'completed') throw new ValidationSuperseded();
				result = outcome.value;
			} else {
				result = await performValidation();
			}

			if (!result.valid) {
				handleValidationFailure(ctx, result.message);
			}
		}),
	);
}
