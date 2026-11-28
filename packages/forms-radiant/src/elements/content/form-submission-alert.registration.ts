import { SubmissionAlertElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormSubmissionAlert } from './form-submission-alert.js';

export const SubmissionAlertElementRegistration = {
	...SubmissionAlertElementContract,
	render: FormSubmissionAlert,
} satisfies ElementBinding<typeof SubmissionAlertElementContract>;
