import { csrf } from '@schema-engine/forms/csrf';
import { createFormEngine } from '@schema-engine/forms';

/** Rails renders the token into `<meta name="csrf-token" content="...">`. */
export const fromMeta = csrf.fromMeta('csrf-token', { header: 'X-CSRF-Token', field: 'authenticity_token' });

/** Django keeps it in the `csrftoken` cookie, which must not be `HttpOnly`. */
export const fromCookie = csrf.fromCookie('csrftoken', { header: 'X-CSRFToken', field: 'csrfmiddlewaretoken' });

/** Anywhere else: a global the server rendered, a store, a call. */
export const fromGlobal = csrf.custom({
	token: () => (globalThis as { csrfToken?: string }).csrfToken,
	header: 'X-CSRF-Token',
});

/** Your engine: add the elements you register beside `csrf`. */
export const engine = createFormEngine({ csrf: fromMeta });
