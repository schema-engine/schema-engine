import { useMemo } from 'react';
import type { FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import { toFieldErrors } from '@/lib/field-errors';
import { validateFormValues, type ValidationElementTree } from '@schema-engine/forms';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import { ValidationSuperseded, type ValidationRegistry } from '@schema-engine/forms/schemas/validation';

type Outcome = Awaited<ReturnType<typeof validateFormValues>>;

/**
 * @remarks
 * Converts the engine's flat errors to the nested shape React Hook Form needs to clear individual field errors on revalidation.
 * Only the issue to show crosses, with the rule's type, and warnings do not: React Hook Form has no channel for them. A rule that could not run (a throwing rule, an unavailable service) cannot be left out, or a submit would pass on a value nothing judged: the adapter shows it as an error of its rule type, which the engine itself never does.
 *
 * A check replaced by a later one before it ran has no result. The call waits for the later run to finish and
 * then asks again for its own names and values, so it answers for what it was asked and never adopts the
 * outcome of another call: a submit cannot pass early because a single field was checked after it.
 */
export function createFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	const debounceScope = createDebounceScope();
	let latest: Promise<Outcome> | undefined;

	return async (values: FieldValues, _context, options): Promise<ResolverResult> => {
		const ask = (): Promise<Outcome> => {
			const run = validateFormValues({ elements, values, registry, names: options.names, debounceScope });
			latest = run;
			return run;
		};
		let attempt = ask();
		let found = await attempt;
		while (found.superseded.length > 0) {
			if (latest === attempt) throw new ValidationSuperseded();
			await latest?.catch(() => undefined);
			attempt = ask();
			found = await attempt;
		}
		const failed = Object.entries(found.failures).map(
			([path, failures]) => [path, { type: failures[0].ruleType, message: failures[0].ruleType }] as const,
		);
		const errors = Object.fromEntries([
			...Object.entries(found.issues).flatMap(([path, issues]) => {
				const blocking = issues.filter((issue) => issue.severity === 'error');
				return blocking.length > 0
					? [[path, { type: blocking[0].type, message: blocking[0].message ?? blocking[0].type }]]
					: [];
			}),
			...failed,
		]);
		return Object.keys(errors).length ? { values: {}, errors: toFieldErrors(errors) } : { values, errors: {} };
	};
}

export function useFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	return useMemo(() => createFormValidationResolver(elements, registry), [elements, registry]);
}
