/**
 * Form Engine Actions System
 *
 * A flexible, plugin-based action system with sequential execution and lifecycle management.
 * All actions are now plugins - no core actions are hardcoded.
 *
 * @example Basic Usage
 * ```typescript
 * import { registerAction, ActionExecutor } from "@/lib/form-engine/actions";
 * import { submitPlugin, notificationPlugin } from "@/lib/form-engine/actions/plugins";
 *
 * // Register plugins
 * registerAction(submitPlugin({ onSuccess: (data) => console.log(data) }));
 * registerAction(notificationPlugin({ onSuccess: (msg) => toast.success(msg) }));
 *
 * // Execute actions
 * const executor = new ActionExecutor();
 * await executor.executeTrigger(actions, "form_submit", context);
 * ```
 */

export { ActionExecutor } from "./action-executor";
export { registerAction, actionRegistry } from "./action-registry";
export * from "./types";
export * from "./plugins";
