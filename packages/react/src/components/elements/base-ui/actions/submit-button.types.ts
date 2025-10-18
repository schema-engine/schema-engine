import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const SubmitButtonSchema = BaseFieldSchema.extend({
	__id: z.literal('submit'),
	label: z.string().default('Submit'),
});

export type SubmitButtonConfig = z.infer<typeof SubmitButtonSchema>;

export type SubmitButtonProps = SubmitButtonConfig & {
	disabled?: boolean;
	onClick?: () => void;
};
