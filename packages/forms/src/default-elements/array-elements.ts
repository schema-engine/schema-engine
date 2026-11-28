/**
 * Array field type — dynamic lists of scalar fields or nested objects.
 */

import * as z from 'zod/mini';
import { BaseFieldSchema } from '../schemas/base-field.js';
import { elementChildrenSchema } from '../lib/element-children.js';
import { defineInputContract } from './define-contract.js';

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

/** The contract of the `array-elements` element: what every renderer of it agrees on. */
export const ArrayElementContract = defineInputContract({
	$type: 'arrayElements',
	childPaths: [{ keys: ['elements'], list: true }],
	appearanceAxes: ['size'],
	containerKind: 'array',
	schema: ArrayElementConfigSchema,
	metadata: {
		name: 'Array Field',
		description: 'Dynamic array field for managing lists of repeatable form elements',
		category: 'input',
	},
});
