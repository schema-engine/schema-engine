/**
 * Fieldset field type — groups related fields into a nested object.
 */

import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { elementChildrenSchema, type ElementRenderProps } from '@schema-engine/forms';

export const FieldSetConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('fieldSet'),
	legend: z.optional(z.string()).check(z.describe('Legend text displayed at the top of the fieldset')),
	elements: elementChildrenSchema.check(z.minLength(1)).check(z.describe('Field definitions for the nested object')),
});

export type FieldSetConfig = z.output<typeof FieldSetConfigSchema>;
export type FieldSetInput = z.input<typeof FieldSetConfigSchema>;

export type FieldSetProps = ElementRenderProps<typeof FieldSetConfigSchema>;
