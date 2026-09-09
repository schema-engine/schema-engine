import * as z from 'zod/mini';
import { collectValidatableFields, createZodSchemaFromRules } from '@schema-engine/forms/schemas/validation/utils';
import { expandFieldTemplatePaths, getValueAtPath } from '@schema-engine/forms/lib/path-values';

export async function validateFormValues(
	elements: readonly object[],
	values: Record<string, unknown>,
): Promise<Record<string, string>> {
	const errors: Record<string, string> = {};

	await Promise.all(
		collectValidatableFields(elements).flatMap(({ path: templatePath, rules }) =>
			expandFieldTemplatePaths(values, templatePath).map(async (path) => {
				const value = getValueAtPath(values, path);
				try {
					const schema = createZodSchemaFromRules(rules, values);
					const result = await z.safeParseAsync(schema, value);
					if (!result.success) {
						errors[path] = result.error.issues[0]?.message || 'Validation failed';
					}
				} catch {
					errors[path] = 'Validation failed';
				}
			}),
		),
	);

	return errors;
}
