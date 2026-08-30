import { z } from 'zod';
import { createZodSchemaFromRules, getValidationRulesForElement } from '@schema-engine/forms/schemas/validation/utils';
import { getValueAtPath } from './path-utils';

function collectValidatableFields(elements: any[], basePath = ''): Array<{ path: string; rules: any[] }> {
	const fields: Array<{ path: string; rules: any[] }> = [];

	for (const element of elements) {
		if (!element.name) continue;

		const currentPath = basePath ? `${basePath}.${element.name}` : element.name;

		if (element.elements?.length) {
			fields.push(...collectValidatableFields(element.elements, currentPath));
		}

		const rules = getValidationRulesForElement(element);
		if (rules?.length && !element.elements?.length) {
			fields.push({ path: currentPath, rules });
		}
	}

	return fields;
}

function getAllFieldPaths(values: Record<string, unknown>, templatePath: string): string[] {
	const parts = templatePath.split('.');
	const paths: string[] = [];

	function traverse(obj: unknown, currentParts: string[], remainingParts: string[]): void {
		if (remainingParts.length === 0) {
			paths.push(currentParts.join('.'));
			return;
		}

		const [nextPart, ...rest] = remainingParts;
		const nextValue = (obj as Record<string, unknown> | undefined)?.[nextPart];

		if (Array.isArray(nextValue)) {
			for (let index = 0; index < nextValue.length; index += 1) {
				traverse(nextValue[index], [...currentParts, nextPart, String(index)], rest);
			}
		} else if (nextValue !== undefined) {
			traverse(nextValue, [...currentParts, nextPart], rest);
		}
	}

	traverse(values, [], parts);
	return paths;
}

export async function validateFormValues(
	elements: any[],
	values: Record<string, unknown>,
): Promise<Record<string, string>> {
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

	const errors: Record<string, string> = {};

	await Promise.all(
		allValidations.map(async ({ path, rules }) => {
			const value = getValueAtPath(values, path);
			try {
				const schema = createZodSchemaFromRules(rules, values);
				await schema.parseAsync(value);
			} catch (error) {
				if (error instanceof z.ZodError) {
					errors[path] = error.issues[0]?.message || 'Validation failed';
				}
			}
		}),
	);

	return errors;
}
