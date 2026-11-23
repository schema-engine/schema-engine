import { createFormEngine, type FormSubmitHelpers, type FormValues } from '@schema-engine/forms';
import { csrf } from '@schema-engine/forms/csrf';
import { fromProblemDetails } from '@schema-engine/forms/server-errors';
import { textRegistration } from './engine';

export const csrfEngine = createFormEngine({
	elements: [textRegistration],
	csrf: csrf.fromMeta('csrf-token', { header: 'x-csrf-token', field: '_csrf' }),
});

export async function onSubmit(values: FormValues, { fetch, setServerErrors }: FormSubmitHelpers) {
	const response = await fetch('/api/contact', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(values),
	});
	if (!response.ok) setServerErrors(fromProblemDetails(await response.json()));
}
