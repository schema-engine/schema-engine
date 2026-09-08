/**
 * Fieldset field type — groups related fields into a nested object.
 */

import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { elementChildrenSchema } from '@schema-engine/forms';
import type { ElementRenderProps } from '@schema-engine/forms';

export const FieldSetConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('fieldSet'),
	legend: z.string().optional().describe('Legend text displayed at the top of the fieldset'),
	elements: elementChildrenSchema.min(1).describe('Field definitions for the nested object'),
});

export type FieldSetConfig = z.output<typeof FieldSetConfigSchema>;
export type FieldSetInput = z.input<typeof FieldSetConfigSchema>;

export type FieldSetProps = ElementRenderProps<
	typeof FieldSetConfigSchema,
	{
		onChange?: (value: unknown) => void;
		onBlur?: () => void;
		onFocus?: () => void;
	}
>;
