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
 * import { SubmitActionRegistration, ResetActionRegistration } from '@schema-engine/forms';
 * ```
 */

export * from './form-submit.registration';
export * from './notification.registration';
export * from './form-reset.registration';
export * from './auto-save.registration';
export * from './gtm.registration';
