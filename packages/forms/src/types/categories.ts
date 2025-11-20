/**
 * Element categories define the semantic type and behavior of form elements.
 *
 * These categories are used to:
 * - Organize elements in form builders
 * - Apply category-specific validation rules
 * - Filter and search elements by type
 * - Determine if 'name' field is required (only 'input' category)
 */
export const ElementCategory = {
	INPUT: 'input',
	CONTENT: 'content',
	ACTION: 'action',
	DECORATION: 'decoration',
	INTERACTIVE: 'interactive',
} as const;

export type ElementCategory = (typeof ElementCategory)[keyof typeof ElementCategory];

/**
 * Type guard to check if a value is a valid ElementCategory
 */
export function isElementCategory(value: unknown): value is ElementCategory {
	return typeof value === 'string' && Object.values(ElementCategory).includes(value as ElementCategory);
}
