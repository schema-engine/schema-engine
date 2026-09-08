/**
 * Action plugin system for FormEngine
 *
 * ## Plugin Factories (Custom Configuration)
 * Use these to create actions with custom configuration:
 *
 * @example Custom Configuration
 * ```typescript
 * import { createFormEngine, submitPlugin } from '@schema-engine/forms';
 * import type { SubmitAction } from '@schema-engine/forms';
 *
 * // Manually register the type
 * declare global {
 *   namespace FormEngine {
 *     interface ActionRegistry {
 *       submit: SubmitAction;
 *     }
 *   }
 * }
 *
 * const engine = createFormEngine({
 *   actions: [submitPlugin({
 *     onSuccess: (data) => myCustomHandler(data)
 *   })],
 * });
 * ```
 *
 * ## Pre-configured Registrations (Recommended)
 * Import registration files for automatic type augmentation:
 *
 * @example Using Registrations
 * ```typescript
 * import { createFormEngine, SubmitActionRegistration } from '@schema-engine/forms';
 * // ↑ Type is automatically registered when you import this
 *
 * const engine = createFormEngine({
 *   actions: [SubmitActionRegistration],
 * });
 * ```
 */

/** Plugin factory functions (require manual type registration). */
export * from './auto-save.plugin';
export * from './gtm.plugin';
export * from './notification.plugin';
export * from './form-reset.plugin';
export * from './form-submit.plugin';

/** Pre-configured registrations with automatic type augmentation. */
export * from './auto-save.registration';
export * from './gtm.registration';
export * from './notification.registration';
export * from './form-reset.registration';
export * from './form-submit.registration';

/** Convenience re-exports. */
export * from './registrations';
