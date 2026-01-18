import { FormSubmissionAlert } from './form-submission-alert';
import type { SubmissionAlertConfig, SubmissionAlertProps } from './form-submission-alert.types';
import { SubmissionAlertConfigSchema } from './form-submission-alert.types';
import type { InputRegistration } from '@schema-engine/forms/types';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'submission-alert': SubmissionAlertConfig;
		}
	}
}

export const SubmissionAlertElementRegistration: InputRegistration<
	'submission-alert',
	SubmissionAlertConfig,
	SubmissionAlertProps
> = {
	$type: 'submission-alert',
	render: FormSubmissionAlert,
	schema: SubmissionAlertConfigSchema,
	metadata: {
		name: 'Submission Alert',
		description: 'Displays form submission status (pending, success, error)',
		category: 'content',
	},
};
