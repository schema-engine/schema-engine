import { createDesignSystem, renderDocument, type Rendered } from './design-system';

const system = createDesignSystem();

export type Loaded = ({ success: true } & Rendered) | { success: false; error: string };

/**
 * Fetches a document and renders what the client knows how to render.
 *
 * @remarks
 * A status that is not a success is a result the caller can show. A network failure or a body that is not JSON
 * throws, as any `fetch` call does. A document that arrives but holds nodes the client cannot render is a success
 * with `issues`.
 */
export async function loadDocument(url: string): Promise<Loaded> {
	const response = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) return { success: false, error: `The server answered ${response.status}.` };
	return { success: true, ...renderDocument(system, await response.json()) };
}
