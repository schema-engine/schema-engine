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

export { notificationPlugin } from "./notification-plugin";
export { autoSavePlugin } from "./auto-save-plugin";
export { resetPlugin } from "./reset-plugin";
export { submitPlugin } from "./submit-plugin";

export { NotificationActionSchema, type NotificationAction } from "./notification-plugin";
export { AutoSaveActionSchema, type AutoSaveAction } from "./auto-save-plugin";
export { ResetActionSchema, type ResetAction } from "./reset-plugin";
export { SubmitActionSchema, type SubmitAction } from "./submit-plugin";

export type { NotificationPluginConfig } from "./notification-plugin";
export type { AutoSavePluginConfig, AutoSaveStorage } from "./auto-save-plugin";
export type { ResetPluginConfig } from "./reset-plugin";
export type { SubmitPluginConfig } from "./submit-plugin";
