import { FormSubmissionAlert } from './form-submission-alert';
import type { SubmissionAlertConfig } from './form-submission-alert.types';
import { SubmissionAlertConfigSchema } from './form-submission-alert.types';
import { defineStatic } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'submission-alert': SubmissionAlertConfig;
		}
	}
}

export const SubmissionAlertElementRegistration = defineStatic({
	$type: 'submission-alert',
	render: FormSubmissionAlert,
	schema: SubmissionAlertConfigSchema,
	metadata: {
		name: 'Submission Alert',
		description: 'Displays form submission status (pending, success, error)',
		category: 'content',
	},
});
