/**
 * Convenience re-exports for all action registrations
 *
 * Import individual registrations for tree-shaking:
 * @example
 * ```typescript
 * import { SubmitActionRegistration } from '@json-form-engine/core/actions/plugins/submit-registration';
 * ```
 *
 * Or import multiple from this file:
 * @example
 * ```typescript
 * import { SubmitActionRegistration, ResetActionRegistration } from '@json-form-engine/core/actions/plugins/registrations';
 * ```
 */

export { SubmitActionRegistration } from './submit-registration';
export { NotificationActionRegistration } from './notification-registration';
export { ResetActionRegistration } from './reset-registration';
export { AutoSaveActionRegistration } from './auto-save-registration';
export { GTMActionRegistration } from './gtm-registration';
