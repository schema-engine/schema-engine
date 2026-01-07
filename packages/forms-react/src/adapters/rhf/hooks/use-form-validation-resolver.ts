import { useCallback } from 'react';
import { z } from 'zod';
import type { FieldValues, ResolverResult } from 'react-hook-form';
import { createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation/utils';

/**
 * Recursively collects all fields with validation rules from the element tree
 */
function collectValidatableFields(elements: any[], basePath = ''): Array<{ path: string; rules: any[] }> {
	const fields: Array<{ path: string; rules: any[] }> = [];

	for (const element of elements) {
		if (!element.name) continue;

		const currentPath = basePath ? `${basePath}.${element.name}` : element.name;

		if (element.elements?.length) {
			const nestedFields = collectValidatableFields(element.elements, currentPath);
			fields.push(...nestedFields);
		}

		if (element.rules?.length && !element.elements?.length) {
			fields.push({ path: currentPath, rules: element.rules });
		}
	}

	return fields;
}

/**
 * Expands a template path (e.g. "contacts.name") into actual paths
 * based on the values in the form (e.g. "contacts.0.name", "contacts.1.name")
 */
function getAllFieldPaths(values: FieldValues, templatePath: string): string[] {
	const parts = templatePath.split('.');
	const paths: string[] = [];

	function traverse(obj: any, currentParts: string[], remainingParts: string[]): void {
		if (remainingParts.length === 0) {
			paths.push(currentParts.join('.'));
			return;
		}

		const [nextPart, ...rest] = remainingParts;
		const nextValue = obj?.[nextPart];

		if (Array.isArray(nextValue)) {
			for (let i = 0; i < nextValue.length; i++) {
				traverse(nextValue[i], [...currentParts, nextPart, String(i)], rest);
			}
		} else if (nextValue !== undefined) {
			traverse(nextValue, [...currentParts, nextPart], rest);
		}
	}

	traverse(values, [], parts);
	return paths;
}

/**
 * Gets a value from an object using a dot-notation path
 */
function getValueAtPath(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Creates a React Hook Form resolver that validates fields using Zod schemas.
 * Handles both simple fields and nested array fields with dynamic indices.
 */
export function useFormValidationResolver(elements: any[]) {
	return useCallback(
		async (values: FieldValues): Promise<ResolverResult> => {
			const validatableFields = collectValidatableFields(elements);
			const allValidations: Array<{ path: string; rules: any[] }> = [];

			for (const { path: templatePath, rules } of validatableFields) {
				const actualPaths = getAllFieldPaths(values, templatePath);
				if (actualPaths.length > 0) {
					for (const actualPath of actualPaths) {
						allValidations.push({ path: actualPath, rules });
					}
				} else {
					allValidations.push({ path: templatePath, rules });
				}
			}

			const errors: Record<string, { type: string; message: string }> = {};

			await Promise.all(
				allValidations.map(async ({ path, rules }) => {
					const value = getValueAtPath(values, path);
					try {
						const schema = createZodSchemaFromRules(rules, values);
						await schema.parseAsync(value);
					} catch (error) {
						if (error instanceof z.ZodError) {
							errors[path] = {
								type: 'validation',
								message: error.issues[0]?.message || 'Validation failed',
							};
						}
					}
				}),
			);

			if (Object.keys(errors).length === 0) {
				return { values, errors: {} };
			}

			return { values: {}, errors };
		},
		[elements],
	);
}
