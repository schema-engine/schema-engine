import { useMemo } from 'react';
import * as z from 'zod/mini';
import type { FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import { collectValidatableFields, createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation/utils';
import { expandFieldTemplatePaths, getValueAtPath } from '@schema-engine/forms/lib/path-values';

function pathIsRequested(path: string, names?: readonly string[]): boolean {
	if (!names?.length) {
		return true;
	}

	return names.some((name) => path === name || path.startsWith(`${name}.`));
}

/**
 * Creates a React Hook Form resolver that validates fields using Zod Mini schemas.
 * Handles both simple fields and nested array fields with dynamic indices.
 * When RHF passes `options.names` (for example, next-step validation),
 * only those fields are validated so later steps stay untriggered.
 */
export function createFormValidationResolver(elements: readonly object[]): Resolver {
	return async (values: FieldValues, _context, options): Promise<ResolverResult> => {
		const validatableFields = collectValidatableFields(elements);
		const errors: Record<string, { type: string; message: string }> = {};

		await Promise.all(
			validatableFields.flatMap(({ path: templatePath, rules }) =>
				expandFieldTemplatePaths(values, templatePath)
					.filter((actualPath) => pathIsRequested(actualPath, options?.names))
					.map(async (path) => {
						const value = getValueAtPath(values, path);
						try {
							const schema = createZodSchemaFromRules(rules, values);
							const result = await z.safeParseAsync(schema, value);
							if (!result.success) {
								errors[path] = {
									type: 'validation',
									message: result.error.issues[0]?.message || 'Validation failed',
								};
							}
						} catch {
							errors[path] = { type: 'validation', message: 'Validation failed' };
						}
					}),
			),
		);

		if (Object.keys(errors).length === 0) {
			return { values, errors: {} };
		}

		return { values: {}, errors };
	};
}

export function useFormValidationResolver(elements: readonly object[]): Resolver {
	return useMemo(() => createFormValidationResolver(elements), [elements]);
}
