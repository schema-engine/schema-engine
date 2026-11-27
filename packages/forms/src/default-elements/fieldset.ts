/**
 * Fieldset field type — groups related fields into a nested object.
 */

import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInputContract } from './define-contract';

export const FieldSetConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('fieldSet'),
	legend: z.optional(z.string()).check(z.describe('Legend text displayed at the top of the fieldset')),
	elements: elementChildrenSchema.check(z.minLength(1)).check(z.describe('Field definitions for the nested object')),
});

export type FieldSetConfig = z.output<typeof FieldSetConfigSchema>;
export type FieldSetInput = z.input<typeof FieldSetConfigSchema>;

/** The contract of the `fieldset` element: what every renderer of it agrees on. */
export const FieldSetContract = defineInputContract({
	$type: 'fieldSet',
	appearanceAxes: ['size'],
	schema: FieldSetConfigSchema,
	metadata: {
		name: 'FieldSet',
		description: 'Groups related form fields into a nested object structure',
		category: 'input',
	},
});
