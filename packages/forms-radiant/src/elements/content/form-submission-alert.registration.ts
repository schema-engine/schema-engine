import { FormSubmissionAlert } from './form-submission-alert';
import type { SubmissionAlertConfig, SubmissionAlertProps } from '@/registry/forms/content/form-submission-alert.types';
import { SubmissionAlertConfigSchema } from '@/registry/forms/content/form-submission-alert.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

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
	schema: asStandardSchema(SubmissionAlertConfigSchema),
	metadata: {
		name: 'Submission Alert',
		description: 'Displays form submission status (success, error)',
		category: 'content',
	},
};
