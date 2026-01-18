console.log('Hello from input.script.ts (Monkey Patch)');

/**
 * MOCK API INTERCEPTOR
 *
 * This script overrides the global window.fetch function to intercept API requests
 * and return mock responses for the demo application. This eliminates the need
 * for a running backend server during development or static deployment.
 *
 * Intercepted Endpoints:
 * - POST /api/submit-demo
 * - POST /api/test-async
 * - POST /api/async-validate
 */

const originalFetch = window.fetch;

const delay = (ms = 1500) => new Promise((resolve) => setTimeout(resolve, ms));

// @ts-expect-error: mocking fetch to avoid ha
window.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

	/**
	 * Endpoint: /api/submit-demo
	 * Returns a generic success response for form submissions.
	 */
	if (url.endsWith('/api/submit-demo') && init?.method === 'POST') {
		console.log('[Mock] Intercepting submit-demo');
		let body: Record<string, any> = {};
		if (init.body instanceof FormData) {
			body = Object.fromEntries(init.body.entries());
		} else if (typeof init.body === 'string') {
			try {
				body = JSON.parse(init.body);
			} catch {}
		}
		console.log('[Mock] Received data:', body);

		await delay();
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	/**
	 * Endpoint: /api/test-async
	 * Simple validation check: if value is "invalid", returns false.
	 */
	if (url.endsWith('/api/test-async') && init?.method === 'POST') {
		try {
			let body: Record<string, any> = {};
			if (init?.body instanceof FormData) {
				body = Object.fromEntries(init.body.entries());
			} else if (typeof init?.body === 'string') {
				try {
					body = JSON.parse(init.body);
				} catch {}
			}
			console.log('[Mock] 🧪 Test async endpoint:', body);

			await delay();

			if (body.value === 'invalid') {
				return new Response(JSON.stringify({ valid: false, message: 'Test failed: value is invalid' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ valid: true, message: 'Test passed' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch {
			return new Response(JSON.stringify({ valid: false, message: 'Internal Mock Error' }), { status: 500 });
		}
	}

	/**
	 * Endpoint: /api/async-validate
	 * Handles complex validation logic for different fields (username, email, companyCode).
	 * Replicates the logic previously found in the backend code.
	 */
	if (url.endsWith('/api/async-validate') && init?.method === 'POST') {
		console.log('[Mock] Intercepting async validation request');

		try {
			let body: Record<string, any> = {};
			if (init?.body instanceof FormData) {
				body = Object.fromEntries(init.body.entries());
			} else if (typeof init?.body === 'string') {
				try {
					body = JSON.parse(init.body);
				} catch {}
			}

			const { value, field } = body;
			console.log('[Mock] Validating:', { field, value });

			await delay();

			let response = { valid: true, message: '' };

			switch (field) {
				case 'username':
					const unavailableUsernames = ['admin', 'root', 'invalid', 'test', 'user'];
					if (unavailableUsernames.includes(typeof value === 'string' ? value.toLowerCase() : '')) {
						console.log('[Mock] Username validation failed:', value);
						response = { valid: false, message: `Username "${value}" is not available` };
					} else {
						console.log('[Mock] Username validation passed:', value);
					}
					break;

				case 'email':
					const blockedDomains = ['tempmail.com', '10minutemail.com', 'invalid.com'];
					const domain = typeof value === 'string' ? value.split('@')[1]?.toLowerCase() : '';
					if (blockedDomains.includes(domain)) {
						console.log('[Mock] Email domain blocked:', domain);
						response = { valid: false, message: `Email domain "${domain}" is not supported` };
					} else if (typeof value === 'string' && value.toLowerCase().includes('invalid')) {
						console.log('[Mock] Email contains invalid content:', value);
						response = { valid: false, message: 'Email contains invalid content' };
					} else {
						console.log('[Mock] Email validation passed:', value);
					}
					break;

				case 'companyCode':
					const validCodes = ['ABC123', 'XYZ456', 'DEF789', 'GHI012'];
					if (
						value &&
						typeof value === 'string' &&
						!validCodes.includes(value.toUpperCase()) &&
						value.toLowerCase() !== 'invalid'
					) {
						if (/^[A-Z]{2,4}[0-9]{3,6}$/.test(value.toUpperCase())) {
							console.log('[Mock] Company code not found:', value);
							response = {
								valid: false,
								message: `Company code "${value.toUpperCase()}" not found in our system`,
							};
						}
					}
					if (response.valid && typeof value === 'string' && value.toLowerCase() === 'invalid') {
						console.log('[Mock] Company code is invalid:', value);
						response = { valid: false, message: 'Company code is invalid' };
					}
					if (response.valid) {
						console.log('[Mock] Company code validation passed:', value);
					}
					break;

				case 'dependentField':
					const dependsOn = body.dependsOn;
					console.log('[Mock] Dependent field validation - dependsOn object:', dependsOn);

					if (dependsOn && typeof dependsOn === 'object' && dependsOn.username) {
						const usernameValue = dependsOn.username;
						if (usernameValue === 'admin' && typeof value === 'string' && value.toLowerCase() === 'user') {
							console.log(
								'[Mock] Dependent field validation failed:',
								value,
								'depends on username:',
								usernameValue,
							);
							response = {
								valid: false,
								message: 'Cannot use "user" value when username is "admin"',
							};
						}
					}

					if (response.valid && typeof value === 'string' && value.toLowerCase() === 'invalid') {
						console.log('[Mock] Dependent field invalid:', value);
						response = { valid: false, message: 'This value conflicts with the selected username' };
					}
					if (response.valid) {
						console.log('[Mock] Dependent field validation passed:', value);
					}
					break;

				default:
					if (typeof value === 'string' && value.toLowerCase() === 'invalid') {
						console.log('[Mock] Generic validation failed:', value);
						response = { valid: false, message: `Value "${value}" is not allowed` };
					} else {
						console.log('[Mock] Generic validation passed:', value);
					}
					break;
			}

			console.log('[Mock] Response:', response);
			return new Response(JSON.stringify(response), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('[Mock] Error processing request', error);
			return new Response(JSON.stringify({ valid: false, message: 'Internal Mock Error' }), { status: 500 });
		}
	}

	return originalFetch(input, init);
};
