import { FormSubmissionAlert } from './form-submission-alert';
import { SubmissionAlertElementContract } from '@schema-engine/forms/elements';
import { defineStatic } from '@schema-engine/forms';

export const SubmissionAlertElementRegistration = defineStatic({
	...SubmissionAlertElementContract,
	render: FormSubmissionAlert,
});
