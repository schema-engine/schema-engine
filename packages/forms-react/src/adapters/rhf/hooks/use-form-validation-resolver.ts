import { useCallback } from 'react';
import { z } from 'zod';
import type { FieldValues, ResolverResult } from 'react-hook-form';
import { createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation/utils';

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

function getValueAtPath(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function useFormValidationResolver(elements: any[]) {
	return useCallback(
		async (values: FieldValues): Promise<ResolverResult<FieldValues>> => {
			const validatableFields = collectValidatableFields(elements);
			const allValidations: Array<{ path: string; rules: any[] }> = [];

			for (const { path: templatePath, rules } of validatableFields) {
				const actualPaths = getAllFieldPaths(values, templatePath);
				for (const actualPath of actualPaths) {
					allValidations.push({ path: actualPath, rules });
				}
			}

			const errors: Record<string, { type: string; message: string }> = {};

			await Promise.all(
				allValidations.map(async ({ path, rules }) => {
					const value = getValueAtPath(values, path);
					try {
						const schema = createZodSchemaFromRules(rules, values, path);
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
