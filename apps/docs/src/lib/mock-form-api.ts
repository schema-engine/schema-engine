const MOCK_FLAG = '__schemaEngineMockFetch';
const MOCK_SUBMIT_PATHS = new Set(['/api/submit-demo', '/api/demo-submit']);

function parseBody(init?: RequestInit): Record<string, unknown> {
	if (!init?.body) return {};
	if (init.body instanceof FormData) return Object.fromEntries(init.body.entries());
	if (typeof init.body === 'string') {
		try {
			return JSON.parse(init.body) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	return {};
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function pathOf(url: string): string {
	try {
		return new URL(url, 'http://localhost').pathname;
	} catch {
		return url;
	}
}

/** Intercepts demo submit/async-validation fetches so FormRenderer works without a backend. */
export function installMockFormApi(): void {
	if (typeof window === 'undefined') return;
	if ((window as Window & { [MOCK_FLAG]?: boolean })[MOCK_FLAG]) return;

	const originalFetch = window.fetch.bind(window);
	(window as Window & { [MOCK_FLAG]?: boolean })[MOCK_FLAG] = true;

	window.fetch = async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const pathname = pathOf(url);

		if (MOCK_SUBMIT_PATHS.has(pathname) && init?.method === 'POST') {
			await new Promise((resolve) => setTimeout(resolve, 400));
			return json({ success: true });
		}

		if (pathname === '/api/async-validate' && init?.method === 'POST') {
			const body = parseBody(init);
			const value = String(body.value ?? '');
			if (value.toLowerCase() === 'invalid') {
				return json({ valid: false, message: `Value "${value}" is not allowed` });
			}
			return json({ valid: true });
		}

		return originalFetch(input, init);
	};
}
