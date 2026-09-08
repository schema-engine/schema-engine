/**
 * Array field type — dynamic lists of scalar fields or nested objects.
 */

import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { elementChildrenSchema } from '@schema-engine/forms';
import type { ElementRenderProps } from '@schema-engine/forms';

export const ArrayElementConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('arrayElements'),
	minItems: z.number().min(0).optional().describe('Minimum number of items allowed'),
	maxItems: z.number().min(1).optional().describe('Maximum number of items allowed'),
	addButtonText: z.string().optional().describe('Text for the add button'),
	removeButtonText: z.string().optional().describe('Text for the remove button'),
	emptyStateMessage: z.string().optional().describe('Message shown when array is empty'),
	initialValues: z.record(z.string(), z.any()).optional().describe('Default values for new items'),
	elements: elementChildrenSchema.min(1).describe('Field definitions for each item in the array'),
});

export type ArrayElementsConfig = z.output<typeof ArrayElementConfigSchema>;
export type ArrayElementsInput = z.input<typeof ArrayElementConfigSchema>;

export type ArrayElementsProps = ElementRenderProps<
	typeof ArrayElementConfigSchema,
	{
		onChange?: (value: unknown) => void;
		onBlur?: () => void;
		onFocus?: () => void;
	}
>;
