/**
 * Array field type — dynamic lists of scalar fields or nested objects.
 */

import * as z from 'zod/mini';
import { BaseFieldSchema, elementChildrenSchema, type ElementRenderProps } from '@schema-engine/forms';

export const ArrayElementConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('arrayElements'),
	minItems: z.optional(z.number().check(z.gte(0))).check(z.describe('Minimum number of items allowed')),
	maxItems: z.optional(z.number().check(z.gte(1))).check(z.describe('Maximum number of items allowed')),
	addButtonText: z.optional(z.string()).check(z.describe('Text for the add button')),
	removeButtonText: z.optional(z.string()).check(z.describe('Text for the remove button')),
	emptyStateMessage: z.optional(z.string()).check(z.describe('Message shown when array is empty')),
	initialValues: z.optional(z.record(z.string(), z.unknown())).check(z.describe('Default values for new items')),
	elements: elementChildrenSchema
		.check(z.minLength(1))
		.check(z.describe('Field definitions for each item in the array')),
});

export type ArrayElementsConfig = z.output<typeof ArrayElementConfigSchema>;
export type ArrayElementsInput = z.input<typeof ArrayElementConfigSchema>;

export type ArrayElementsProps = ElementRenderProps<
	typeof ArrayElementConfigSchema,
	{
		ssrInitialRows?: readonly unknown[];
		/** The ids the server's container gave the rows it rendered, from the hydration the form instance serializes. */
		ssrRowIds?: readonly string[];
		initialFormValues?: Record<string, unknown>;
	}
>;
