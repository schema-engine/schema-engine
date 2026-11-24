import { csrf } from '@schema-engine/forms/csrf';

/**
 * Reads the token the server rendered into `<meta name="csrf-token" content="...">` and sends it in a header
 * on every same-origin unsafe request the engine makes.
 */
export const policy = csrf.fromMeta('csrf-token', { header: 'X-CSRF-Token', field: 'authenticity_token' });
