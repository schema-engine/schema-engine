import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

/**
 * Submit button field schema
 */
export const SubmitButtonSchema = BaseFieldSchema.extend({
	$type: z.literal('submit'),
	label: z.string().default('Submit'),
});

/**
 * Submit button config type
 */
export type SubmitButtonConfig = z.infer<typeof SubmitButtonSchema>;

/**
 * Submit button props interface
 */
export type SubmitButtonProps = SubmitButtonConfig & {
	disabled?: boolean;
	onClick?: () => void;
};
