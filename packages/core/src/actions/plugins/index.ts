/**
 * Action plugin system for FormEngine
 *
 * ## Plugin Factories (Custom Configuration)
 * Use these to create actions with custom configuration:
 *
 * @example Custom Configuration
 * ```typescript
 * import { FormEngineBuilder } from "@json-form-engine/core/builder";
 * import { submitPlugin } from "@json-form-engine/core/actions/plugins/submit-plugin";
 * import type { SubmitAction } from "@json-form-engine/core/actions/plugins/submit-plugin";
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
 * const engine = new FormEngineBuilder()
 *   .addAction(submitPlugin({
 *     onSuccess: (data) => myCustomHandler(data)
 *   }))
 *   .build();
 * ```
 *
 * ## Pre-configured Registrations (Recommended)
 * Import registration files for automatic type augmentation:
 *
 * @example Using Registrations
 * ```typescript
 * import { FormEngineBuilder } from "@json-form-engine/core/builder";
 * import { SubmitActionRegistration } from "@json-form-engine/core/actions/plugins/submit-registration";
 * // ↑ Type is automatically registered when you import this
 *
 * const engine = new FormEngineBuilder()
 *   .addAction(SubmitActionRegistration)
 *   .build();
 * ```
 */

// Plugin factory functions (require manual type registration)
export * from './auto-save-plugin';
export * from './gtm-plugin';
export * from './notification-plugin';
export * from './reset-plugin';
export * from './submit-plugin';

// Pre-configured registrations with automatic type augmentation
export * from './auto-save-registration';
export * from './gtm-registration';
export * from './notification-registration';
export * from './reset-registration';
export * from './submit-registration';

// Convenience re-exports
export * from './registrations';
