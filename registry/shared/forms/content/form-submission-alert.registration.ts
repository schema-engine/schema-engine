import { FormSubmissionAlert } from './form-submission-alert';
import { SubmissionAlertConfigSchema } from './form-submission-alert.types';
import { defineStatic } from '@schema-engine/forms';

export const SubmissionAlertElementRegistration = defineStatic({
	$type: 'submission-alert',
	render: FormSubmissionAlert,
	schema: SubmissionAlertConfigSchema,
	metadata: {
		name: 'Submission Alert',
		description: 'Displays form submission status (submitting, success, error)',
		category: 'content',
	},
});
