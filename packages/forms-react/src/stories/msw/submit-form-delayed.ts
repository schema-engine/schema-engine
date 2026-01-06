import { delay, http, HttpResponse } from 'msw';

export const SUBMIT_FORM_DELAY_SUCCESS_URL = '/api/submit-form-success';
export const SUBMIT_FORM_DELAY_ERROR_URL = '/api/submit-form-error';

/**
 * MSW handler that simulates a slow successful submission (2 seconds)
 */
export const submitFormDelaySuccessHandler = http.post(SUBMIT_FORM_DELAY_SUCCESS_URL, async ({ request }) => {
	const data = await request.formData();

	await delay(2000);

	const formData: Record<string, unknown> = {};

	for (const [name, value] of data.entries()) {
		formData[name] = value;
	}

	console.log('[MSW] Delayed success:', formData);

	return HttpResponse.json({ success: true, message: 'Form submitted successfully' });
});

/**
 * MSW handler that simulates a slow failed submission (2 seconds)
 */
export const submitFormDelayErrorHandler = http.post(SUBMIT_FORM_DELAY_ERROR_URL, async ({ request }) => {
	const data = await request.formData();

	await delay(2000);

	const formData: Record<string, unknown> = {};

	for (const [name, value] of data.entries()) {
		formData[name] = value;
	}

	console.log('[MSW] Delayed error:', formData);

	return HttpResponse.json({ error: 'Simulated server error' }, { status: 500 });
});
