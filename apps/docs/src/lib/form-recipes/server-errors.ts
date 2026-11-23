import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';
import { fromJsonApiErrors, fromProblemDetails } from '@schema-engine/forms/server-errors';

const post = (url: string, values: FormValues, { fetch }: FormSubmitHelpers) =>
	fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });

/** For an API that answers with RFC 9457 Problem Details and an `errors[]` list of `{ pointer, detail, code }`. */
export async function submitToProblemDetails(values: FormValues, helpers: FormSubmitHelpers) {
	const response = await post('/api/signup', values, helpers);
	if (!response.ok) helpers.setServerErrors(fromProblemDetails(await response.json()));
}

/** For a JSON:API server that answers with `errors[]` and a `source.pointer` on each. */
export async function submitToJsonApi(values: FormValues, helpers: FormSubmitHelpers) {
	const response = await post('/api/signup', values, helpers);
	if (!response.ok) helpers.setServerErrors(fromJsonApiErrors(await response.json()));
}
