import { useMemo } from 'react';
import type { FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import { toFieldErrors } from '@/lib/field-errors';
import { validateFormValues, type ValidationElementTree } from '@schema-engine/forms';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import { ValidationSuperseded, type ValidationRegistry } from '@schema-engine/forms/schemas/validation';

type Outcome = Awaited<ReturnType<typeof validateFormValues>>;
interface Run {
	readonly values: FieldValues;
	readonly outcome: Promise<Outcome>;
}

/**
 * @remarks
 * Converts the engine's flat errors to the nested shape React Hook Form needs to clear individual field errors on revalidation.
 * Only the issue to show crosses, with the rule's type, and warnings do not: React Hook Form has no channel for them. A rule that could not run rejects the resolver.
 *
 * A check replaced by a later one before it ran has no result, so the call waits for the latest run and returns
 * that run's outcome for its values: a submit can neither pass early nor show a blocking entry with no cause.
 */
export function createFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	const debounceScope = createDebounceScope();
	let latest: Run | undefined;

	async function settle(run: Run): Promise<{ values: FieldValues; found: Outcome }> {
		const found = await run.outcome;
		if (found.superseded.length === 0) return { values: run.values, found };
		if (latest !== undefined && latest !== run) return settle(latest);
		throw new ValidationSuperseded();
	}

	return async (values: FieldValues, _context, options): Promise<ResolverResult> => {
		const run: Run = {
			values,
			outcome: validateFormValues({ elements, values, registry, names: options.names, debounceScope }),
		};
		latest = run;
		const { values: checked, found } = await settle(run);
		const failure = Object.values(found.failures).flat()[0];
		if (failure) throw failure;
		const errors = Object.fromEntries(
			Object.entries(found.issues).flatMap(([path, issues]) => {
				const blocking = issues.filter((issue) => issue.severity === 'error');
				return blocking.length > 0
					? [[path, { type: blocking[0].type, message: blocking[0].message ?? blocking[0].type }]]
					: [];
			}),
		);
		return Object.keys(errors).length
			? { values: {}, errors: toFieldErrors(errors) }
			: { values: checked, errors: {} };
	};
}

export function useFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	return useMemo(() => createFormValidationResolver(elements, registry), [elements, registry]);
}
