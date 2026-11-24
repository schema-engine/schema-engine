import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';

/**
 * Sends the answers as JSON. Any failure throws, which the form reports as a failed submission.
 *
 * @remarks
 * The values hold the fields of the steps the visitor saw: the follow-up step's fields are absent when it was skipped.
 */
export async function sendAnswers(values: FormValues, { fetch }: FormSubmitHelpers): Promise<void> {
	const response = await fetch('/api/surveys', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(values),
	});
	if (!response.ok) throw new Error(`The server answered ${response.status}.`);
}
