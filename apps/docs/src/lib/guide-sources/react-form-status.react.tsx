/** @jsxImportSource react */
import { isSubmissionBusy } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { useFormContext, useWatch } from '@schema-engine/forms-react/hooks';
import { contactForm, engine } from './react-quick-start.react';

/** What the form knows about the visitor's progress: the email typed so far, the submission and a way to start over. */
function FormStatus() {
	const { formState, reset } = useFormContext();
	const email = useWatch('email');
	const { status, submitCount } = formState.submission;
	return (
		<footer>
			<output>
				{typeof email === 'string' && email !== '' ? `Writing to ${email}. ` : ''}
				{isSubmissionBusy(status) ? 'Sending' : `Submissions: ${submitCount}`}
			</output>
			<button type="button" onClick={() => reset()}>
				Start over
			</button>
		</footer>
	);
}

/** The contact form of the quick start with a status line under it, rendered as a child of the form. */
export function ContactWithStatus({ onSubmit }: { onSubmit: () => void }) {
	return (
		<FormRenderer engine={engine} config={contactForm} onSubmit={onSubmit}>
			<FormStatus />
		</FormRenderer>
	);
}
