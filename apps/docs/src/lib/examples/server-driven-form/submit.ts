import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';
import { fromProblemDetails } from '@schema-engine/forms/server-errors';

/**
 * Creates the account and says whether it was created.
 *
 * @remarks
 * `fetch` is the engine's, so the CSRF policy it was built with adds its header to this same-origin request. A 422
 * with Problem Details is shown on the fields it names. Any other failure throws.
 */
export async function signUp(values: FormValues, { fetch, setServerErrors }: FormSubmitHelpers): Promise<boolean> {
	const response = await fetch('/api/signups', {
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
