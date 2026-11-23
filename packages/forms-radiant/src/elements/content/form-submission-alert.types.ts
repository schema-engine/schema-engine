import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

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

export type SubmissionAlertProps = SubmissionAlertConfig;
