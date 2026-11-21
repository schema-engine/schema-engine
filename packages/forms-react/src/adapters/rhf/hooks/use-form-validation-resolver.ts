import { useMemo } from 'react';
import type { FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import { toFieldErrors } from '@/lib/field-errors';
import { validateFormValues, type ValidationElementTree } from '@schema-engine/forms';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';

/**
 * @remarks
 * Converts the engine's flat errors to the nested shape React Hook Form needs to clear individual field errors on revalidation.
 * Only the issue to show crosses, with the rule's type, and warnings do not: React Hook Form has no channel for them. A rule that could not run rejects the resolver.
 */
export function createFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	const debounceScope = createDebounceScope();
	return async (values: FieldValues, _context, options): Promise<ResolverResult> => {
		const { issues, failures, superseded } = await validateFormValues({
			elements,
			values,
			registry,
			names: options.names,
			debounceScope,
		});
		const failure = Object.values(failures).flat()[0];
		if (failure) throw failure;
		const errors = Object.fromEntries(
			Object.entries(issues).flatMap(([path, found]) => {
				const blocking = found.filter((issue) => issue.severity === 'error');
				return blocking.length > 0
					? [[path, { type: blocking[0].type, message: blocking[0].message ?? blocking[0].type }]]
					: [];
			}),
		);
		if (superseded.length > 0) {
			return {
				values: {},
				errors: toFieldErrors({
					...errors,
					...Object.fromEntries(superseded.map((path) => [path, { type: 'pending', message: '' }])),
				}),
			};
		}
		return Object.keys(errors).length ? { values: {}, errors: toFieldErrors(errors) } : { values, errors: {} };
	};
}

export function useFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	return useMemo(() => createFormValidationResolver(elements, registry), [elements, registry]);
}
