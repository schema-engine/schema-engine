/**
 * Convenience re-exports for all action registrations
 *
 * Import individual registrations for tree-shaking:
 * @example
 * ```typescript
 * import { SubmitActionRegistration } from '@schema-engine/forms';
 * ```
 *
 * Or import multiple from this file:
 * @example
 * ```typescript
 * import { SubmitActionRegistration, NotificationActionRegistration } from '@schema-engine/forms';
 * ```
 */

export * from './form-submit.registration.js';
export * from './notification.registration.js';
