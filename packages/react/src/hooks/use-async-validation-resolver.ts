import { useCallback } from 'react';
import { z } from 'zod';
import type { FieldValues, ResolverResult } from 'react-hook-form';
import { createZodSchemaFromRules } from '@json-form-engine/core/schemas/validation/utils';
import type { ValidationRule } from '@json-form-engine/core/schemas/validation/types';

/**
 * Custom form validation resolver with form data access
 *
 * This resolver extends standard validation by providing access to the complete
 * form data during validation. This enables:
 * - Cross-field validation and dependencies
 * - Custom validation that needs context from other fields
 * - Async validation with dynamic request bodies based on form state
 * - Complex validation scenarios that require form-level awareness
 *
 * @param elements - Form elements containing validation rules
 * @returns Custom resolver function for react-hook-form
 *
 * @example
 * ```tsx
 * // For async validation with dependencies
 * const resolver = useFormValidationResolver(formElements);
 * const form = useForm({ resolver });
 *
 * // Usage in validation rules
 * {
 *   type: 'async',
 *   body: { dependsOn: '{{username}}' }, // Will be replaced with actual username value
 *   dependencies: ['username']
 * }
 *
 * // Custom validation that needs form data
 * {
 *   type: 'custom',
 *   // Custom validators can access form data through this resolver
 * }
 * ```
 */
export function useFormValidationResolver(elements: any[]) {
	return useCallback(
		async (values: FieldValues): Promise<ResolverResult<FieldValues>> => {
			const errors: Record<string, any> = {};

			for (const element of elements) {
				if (!element.name) continue;

				let rules: ValidationRule[] | undefined;
				if ('componentId' in element) {
					rules = element.rules;
				} else {
					rules = element.rules;
				}

				if (!rules?.length) continue;

				const fieldValue = values[element.name];

				/**
				 * Process validation rules with form data access
				 * Create a combined schema for all rules of this field to handle async validation properly
				 */
				if (rules.length > 0) {
					try {
						const fieldSchema = createZodSchemaFromRules(rules, values);
						await fieldSchema.parseAsync(fieldValue);
					} catch (zodError) {
						if (zodError instanceof z.ZodError) {
							// Find the most relevant error message
							// Prioritize custom async validation messages over generic ones
							const issues = zodError.issues;
							let bestIssue = issues[0];

							// Look for custom async validation errors first
							for (const issue of issues) {
								if (
									issue.message &&
									!issue.message.includes('Required') &&
									!issue.message.includes('Invalid')
								) {
									bestIssue = issue;
									break;
								}
							}

							errors[element.name] = {
								type: 'validation',
								message: bestIssue?.message || 'Validation failed',
							};
						}
					}
				}
			}

			return {
				values: Object.keys(errors).length === 0 ? values : {},
				errors,
			};
		},
		[elements],
	);
}
