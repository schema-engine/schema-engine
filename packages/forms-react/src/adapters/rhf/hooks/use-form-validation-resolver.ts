import { useMemo } from 'react';
import type { FieldErrors, FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import { validateFormValues, type ValidationElementTree } from '@schema-engine/forms';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import type { ValidationRegistry } from '@schema-engine/forms/schemas/validation';

/** @remarks Preserves the engine's nested errors so RHF can clear individual field errors on revalidation. */
export function createFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	const debounceScope = createDebounceScope();
	return async (values: FieldValues, _context, options): Promise<ResolverResult> => {
		const errors = await validateFormValues({ elements, values, registry, names: options.names, debounceScope });
		return Object.keys(errors).length ? { values: {}, errors: errors as FieldErrors } : { values, errors: {} };
	};
}

export function useFormValidationResolver(elements: ValidationElementTree, registry: ValidationRegistry): Resolver {
	return useMemo(() => createFormValidationResolver(elements, registry), [elements, registry]);
}
