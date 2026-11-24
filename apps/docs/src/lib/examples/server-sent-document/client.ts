import { createDesignSystem, renderDocument, type Rendered } from './design-system';

const system = createDesignSystem();

export type Loaded = ({ success: true } & Rendered) | { success: false; error: string };

/**
 * Fetches a document and renders what the client knows how to render.
 *
 * @remarks
 * Each way the answer can fail is a result, not an exception: the server could not be reached, it answered with a
 * status that is not a success, or its body is not JSON. A document that arrives but holds nodes the client cannot
 * render is a success with `issues`.
 */
export async function loadDocument(url: string, request: typeof fetch = fetch): Promise<Loaded> {
	let response: Response;
	try {
		response = await request(url, { headers: { Accept: 'application/json' } });
	} catch {
		return { success: false, error: 'The server could not be reached.' };
	}
	if (!response.ok) return { success: false, error: `The server answered ${response.status}.` };
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		return { success: false, error: 'The answer is not JSON.' };
	}
	return { success: true, ...renderDocument(system, body) };
}
