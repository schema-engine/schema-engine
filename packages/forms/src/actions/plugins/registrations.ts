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

export { SubmitActionRegistration } from './form-submit.registration';
export { NotificationActionRegistration } from './notification.registration';
export { ResetActionRegistration } from './form-reset.registration';
export { AutoSaveActionRegistration } from './auto-save.registration';
export { GTMActionRegistration } from './gtm.registration';
