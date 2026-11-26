import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineStaticContract } from './define-contract';

export const SubmitButtonSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('submit'),
	label: z._default(z.string(), 'Submit'),
});

export type SubmitButtonConfig = z.infer<typeof SubmitButtonSchema>;

/** The contract of the `submit-button` element: what every renderer of it agrees on. */
export const SubmitButtonElementContract = defineStaticContract({
	$type: 'submit',
	schema: SubmitButtonSchema,
	metadata: {
		name: 'Submit Button',
		description: 'Form submission button that handles submitting state',
		category: 'action',
	},
});
