import * as z from 'zod/mini';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineStaticContract } from './define-contract';

export const SubmissionAlertExtensionSchema = z.object({
	/** Which submission states to show the alert for */
	showOn: z.optional(z.array(z.enum(['idle', 'submitting', 'success', 'error']))),
	/** Auto-dismiss after ms (0 = never) */
	autoDismiss: z.optional(z.number()),
	/** Custom success message */
	successMessage: z.optional(z.string()),
	/** Custom error message */
	errorMessage: z.optional(z.string()),
	/** Custom message while submitting */
	submittingMessage: z.optional(z.string()),
});

export const SubmissionAlertConfigSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('submission-alert'),
	...SubmissionAlertExtensionSchema.shape,
});

export type SubmissionAlertExtension = z.infer<typeof SubmissionAlertExtensionSchema>;
export type SubmissionAlertConfig = z.infer<typeof SubmissionAlertConfigSchema>;

/** The contract of the `submission-alert` element: what every renderer of it agrees on. */
export const SubmissionAlertElementContract = defineStaticContract({
	$type: 'submission-alert',
	schema: SubmissionAlertConfigSchema,
	metadata: {
		name: 'Submission Alert',
		description: 'Displays form submission status (submitting, success, error)',
		category: 'content',
	},
});
