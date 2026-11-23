import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';
import { fromProblemDetails } from '@schema-engine/forms/server-errors';

/**
 * Sends the message to the API and says whether it was accepted.
 *
 * @remarks
 * The values are exactly those that passed validation, and `fetch` is the engine's, so a CSRF policy applies
 * without code here. A 422 answers with Problem Details: it is shown on the fields it names, and the message
 * counts as not sent. Any other failure throws, which the form reports as a failed submission.
 */
export async function sendMessage(values: FormValues, { fetch, setServerErrors }: FormSubmitHelpers): Promise<boolean> {
	const response = await fetch('/api/contact', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(values),
	});
	if (response.status === 422) {
		setServerErrors(fromProblemDetails(await response.json()));
		return false;
	}
	if (!response.ok) throw new Error(`The server answered ${response.status}.`);
	return true;
}
