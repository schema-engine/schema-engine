import { z } from 'zod';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const SubmissionAlertExtensionSchema = z.object({
	/** Which submission states to show the alert for */
	showOn: z.array(z.enum(['idle', 'pending', 'success', 'error'])).optional(),
	/** Auto-dismiss after ms (0 = never) */
	autoDismiss: z.number().optional(),
	/** Custom success message */
	successMessage: z.string().optional(),
	/** Custom error message */
	errorMessage: z.string().optional(),
	/** Custom pending message */
	pendingMessage: z.string().optional(),
});

export const SubmissionAlertConfigSchema = BaseFieldSchema.extend({
	$type: z.literal('submission-alert'),
	...SubmissionAlertExtensionSchema.shape,
});

export type SubmissionAlertExtension = z.infer<typeof SubmissionAlertExtensionSchema>;
export type SubmissionAlertConfig = z.infer<typeof SubmissionAlertConfigSchema>;

export type SubmissionAlertProps = SubmissionAlertConfig;
