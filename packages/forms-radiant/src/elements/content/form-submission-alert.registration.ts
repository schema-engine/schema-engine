import { defineStatic } from '@schema-engine/forms';
import { SubmissionAlertElementContract } from '@schema-engine/forms/default-elements';
import { FormSubmissionAlert } from './form-submission-alert.js';

export const SubmissionAlertElementRegistration = defineStatic({
	...SubmissionAlertElementContract,
	render: FormSubmissionAlert,
});
