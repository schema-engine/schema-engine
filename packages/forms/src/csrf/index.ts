import { isSameOrigin, type CsrfPolicy } from '../lib/form-fetch.js';

export type { CsrfPolicy } from '../lib/form-fetch.js';

/** Where the policy puts the token, besides the reader's own part. */
interface CsrfPlacement {
	/** The request header that carries the token. */
	readonly header: string;
	/** The name of the hidden input a native post carries it in. */
	readonly field?: string;
}

const placed = (token: () => string | undefined, { header, field }: CsrfPlacement): CsrfPolicy => ({
	token,
	header,
	...(field === undefined ? {} : { field }),
});

const textOf = (value: string | null | undefined): string | undefined =>
	value === null || value === undefined || value === '' ? undefined : value;

/**
 * Readers of a CSRF token, each returning the {@link CsrfPolicy} for `createFormEngine({ csrf })`.
 *
 * @remarks
 * A token is read when a request is made and never kept. A reader touches `document` only then, so importing this
 * module is safe on a server, where the token is `undefined`.
 */
export const csrf = {
	/** The `content` of `<meta name="...">`. */
	fromMeta: (name: string, placement: CsrfPlacement): CsrfPolicy =>
		placed(() => {
			if (typeof document === 'undefined') return undefined;
			const meta = Array.from(document.getElementsByTagName('meta')).find((candidate) => candidate.name === name);
			return textOf(meta?.content);
		}, placement),

	/** The decoded value of the cookie `name`. */
	fromCookie: (name: string, placement: CsrfPlacement): CsrfPolicy =>
		placed(() => {
			if (typeof document === 'undefined') return undefined;
			const prefix = `${name}=`;
			const pair = document.cookie.split(';').find((candidate) => candidate.trim().startsWith(prefix));
			if (pair === undefined) return undefined;
			try {
				return textOf(decodeURIComponent(pair.trim().slice(prefix.length)));
			} catch {
				return undefined;
			}
		}, placement),

	/** A token from anywhere, read through `token` at each request. */
	custom: ({ token, ...placement }: CsrfPlacement & { readonly token: () => string | undefined }): CsrfPolicy =>
		placed(() => textOf(token()), placement),
};

/**
 * The hidden input a native form post carries the token in, or `undefined` when it must not.
 *
 * @remarks
 * Pass the method and action the submission will use, not only the form's own: when a submit button sets
 * `formmethod` or `formaction`, those are the effective ones. Only for a form whose `method` is `post` (any case; `get` and `dialog` submit no body a server checks, and a
 * `get` would put the token in the URL) and whose `action` is same-origin, resolved against the document's base URL
 * as {@link CsrfPolicy} resolves a request. An empty action is the page itself. Also `undefined` without a policy,
 * without a `field` on it, and without a token. Read at call time, so a binding calls it when it renders or submits.
 */
export function csrfFieldFor(
	policy: CsrfPolicy | undefined,
	form: { readonly method: string; readonly action: string },
): { readonly name: string; readonly value: string } | undefined {
	const name = policy?.field;
	const value = policy?.token();
	if (name === undefined || value === undefined || form.method.toLowerCase() !== 'post') return undefined;
	return isSameOrigin(form.action) ? { name, value } : undefined;
}
