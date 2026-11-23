import { isSubmissionBusy } from '@schema-engine/forms';
import { useFormContext, useWatch } from '@schema-engine/forms-react/hooks';

export function EmailPreview() {
	const email = useWatch('email');
	return <output>{typeof email === 'string' ? email : ''}</output>;
}

export function ResetButton() {
	const { reset, formState } = useFormContext();
	const busy = isSubmissionBusy(formState.submission.status);
	return (
		<button type="button" onClick={() => reset()} disabled={busy}>
			Reset
		</button>
	);
}
