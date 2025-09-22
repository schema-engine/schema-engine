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
 * - Complex validation scenarios that require form-level awareness
 * - All validation types with proper form context
 *
 * @param elements - Form elements containing validation rules
 * @returns Custom resolver function for react-hook-form
 *
 * @example
 * ```tsx
 * // Basic usage with form elements
 * const resolver = useFormValidationResolver(formElements);
 * const form = useForm({ resolver });
 *
 * // Supports all validation types with form context
 * {
 *   type: 'required',
 *   message: 'This field is required'
 * }
 *
 * // Cross-field validation
 * {
 *   type: 'custom',
 *   dependencies: ['password'],
 *   // Validator receives form data for cross-field logic
 * }
 *
 * // Async validation with dependencies
 * {
 *   type: 'async',
 *   url: '/api/validate',
 *   dependencies: ['username']
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
						const fieldSchema = createZodSchemaFromRules(rules, values, element.name);
						await fieldSchema.parseAsync(fieldValue);
					} catch (zodError) {
						if (zodError instanceof z.ZodError) {
							const issues = zodError.issues;
							let bestIssue = issues[0];

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
