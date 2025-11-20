/**
 * Convenience re-exports for all action registrations
 *
 * Import individual registrations for tree-shaking:
 * @example
 * ```typescript
 * import { SubmitActionRegistration } from '@schema-engine/forms/actions/plugins/submit-registration';
 * ```
 *
 * Or import multiple from this file:
 * @example
 * ```typescript
 * import { SubmitActionRegistration, ResetActionRegistration } from '@schema-engine/formsctions/plugins/registrations';
 * ```
 */

export { SubmitActionRegistration } from './submit-registration';
export { NotificationActionRegistration } from './notification-registration';
export { ResetActionRegistration } from './reset-registration';
export { AutoSaveActionRegistration } from './auto-save-registration';
export { GTMActionRegistration } from './gtm-registration';
