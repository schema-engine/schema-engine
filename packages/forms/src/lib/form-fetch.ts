/**
 * The request function every request of a form goes through: the engine's `fetch`.
 *
 * @remarks Takes a URL as a string or a `URL`, which the global `fetch` and the engine's both accept.
 */
export type FormFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * Where a CSRF token comes from and where it goes.
 *
 * @remarks
 * `token` is read at request time and never stored, so a rotated token is picked up, and `undefined` means there
 * is none to send. `header` carries it on a same-origin unsafe request; `field` is the name of the hidden input a
 * native post carries it in, for a binding to add.
 */
export interface CsrfPolicy {
	token(): string | undefined;
	readonly header: string;
	readonly field?: string;
}

/** The global `fetch`, looked up at each call so a replaced global is honoured. */
export const globalFetch: FormFetch = (input, init) => globalThis.fetch(input, init);

const UNSAFE_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Whether `input` is a URL of the page's own origin. Without a page location nothing can be shown to be, so nothing is.
 *
 * @remarks A relative URL is resolved against the document's base URL (`<base href>` included), as the browser resolves it for the request.
 */
function isSameOrigin(input: string | URL): boolean {
	if (typeof location === 'undefined') return false;
	try {
		const own = new URL(location.href).origin;
		const base = typeof document === 'undefined' || !document.baseURI ? location.href : document.baseURI;
		return own !== 'null' && new URL(input, base).origin === own;
	} catch {
		return false;
	}
}

/**
 * `base` with the policy's token added as a header.
 *
 * @remarks
 * Only to a same-origin request with an unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`), and only while the policy
 * has a token: a cross-origin request never carries it, and a missing token sends no header. A header the caller
 * set under the same name is replaced.
 */
export function withCsrf(base: FormFetch, policy: CsrfPolicy): FormFetch {
	return (input, init) => {
		const token = UNSAFE_METHODS.has((init?.method ?? 'GET').toUpperCase()) ? policy.token() : undefined;
		if (!token || !isSameOrigin(input)) return base(input, init);
		const headers = new Headers(init?.headers);
		headers.set(policy.header, token);
		return base(input, { ...init, headers });
	};
}
