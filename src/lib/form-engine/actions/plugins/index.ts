/**
 * Plugin factories for the form engine action system.
 *
 * These plugins return action configuration objects that you register
 * when and where you need them, providing maximum flexibility.
 *
 * @example Import and register plugins
 * ```typescript
 * import { notificationPlugin, autoSavePlugin, submitPlugin, resetPlugin } from "@/lib/form-engine/actions/plugins";
 * import { registerAction } from "@/lib/form-engine/actions/action-registry";
 *
 * // Configure and register when needed
 * const notifications = notificationPlugin({
 *   onSuccess: (message) => toast.success(message)
 * });
 * registerAction(notifications);
 *
 * const submit = submitPlugin({
 *   onSuccess: (data) => console.log("Submitted:", data)
 * });
 * registerAction(submit);
 * ```
 */

export * from './auto-save-plugin';
export * from './gtm-plugin';
export * from './notification-plugin';
export * from './reset-plugin';
export * from './submit-plugin';
