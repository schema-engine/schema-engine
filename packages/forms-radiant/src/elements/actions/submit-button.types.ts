import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms';

export const SubmitButtonSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('submit'),
	label: z._default(z.string(), 'Submit'),
});

export type SubmitButtonConfig = z.infer<typeof SubmitButtonSchema>;

export type SubmitButtonProps = SubmitButtonConfig & {
	disabled?: boolean;
	onClick?: () => void;
};
