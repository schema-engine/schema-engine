import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';

/**
 * Creates the account and says whether it was created.
 *
 * @remarks
 * A 409 means the email is taken. It is shown on the email field, which sits on the first step, so the wizard
 * moves back to that step: an error is never left on a step the visitor cannot see. Any other failure throws,
 * which the form reports as a failed submission.
 */
export async function register(values: FormValues, { fetch, setServerErrors }: FormSubmitHelpers): Promise<boolean> {
	const response = await fetch('/api/accounts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(values),
	});
	if (response.status === 409) {
		setServerErrors({ email: { type: 'taken', message: 'An account with this email already exists' } });
		return false;
	}
	if (!response.ok) throw new Error(`The server answered ${response.status}.`);
	return true;
}
