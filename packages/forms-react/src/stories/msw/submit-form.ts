import { delay, http, HttpResponse } from 'msw';

export const SUBMIT_FORM_MOCK_URL = '/api/submit-form';

export const submitFormHandler = http.post(SUBMIT_FORM_MOCK_URL, async ({ request }) => {
	const data = await request.formData();

	await delay(1500);

	const formData: Record<string, unknown> = {};

	for (const [name, value] of data.entries()) {
		formData[name] = value;
	}

	console.log(SUBMIT_FORM_MOCK_URL, formData);

	return HttpResponse.json({});
});
