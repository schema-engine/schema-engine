import { z } from 'zod';
import type { ActionExecutionContext, ActionExecutionResult } from '../types';
import { ActionTriggerSchema } from '../triggers';

/**
 * Notification Plugin Configuration
 */
export interface NotificationPluginConfig {
	/** Custom success handler */
	onSuccess?: (message: string, context: ActionExecutionContext) => void | Promise<void>;
	/** Custom error handler */
	onError?: (message: string, context: ActionExecutionContext) => void | Promise<void>;
	/** Custom warning handler */
	onWarning?: (message: string, context: ActionExecutionContext) => void | Promise<void>;
	/** Custom info handler */
	onInfo?: (message: string, context: ActionExecutionContext) => void | Promise<void>;
	/** Global handler for all notification types */
	onNotification?: (message: string, variant: string, context: ActionExecutionContext) => void | Promise<void>;
}

/**
 * Notification Action Schema
 *
 * Shows user notifications with different variants and customizable duration.
 * Configure handlers using the notificationPlugin() factory function.
 *
 * @example Custom Toast Integration
 * ```typescript
 * notificationPlugin({
 *   onSuccess: (message) => toast.success(message),
 *   onError: (message) => toast.error(message),
 *   onWarning: (message) => toast.warning(message)
 * });
 * ```
 */
export const NotificationActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().min(1, 'Action ID cannot be empty'),
	/** Action type identifier */
	type: z.literal('show_notification'),
	/** Optional description for documentation and debugging purposes */
	description: z.string().optional(),
	/** Whether this action is enabled and should be executed */
	enabled: z.boolean().default(true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.array(ActionTriggerSchema).optional(),
	/** Message to display in the notification */
	message: z.string().min(1, 'Message cannot be empty'),
	/** Visual style of the notification */
	variant: z.enum(['success', 'error', 'warning', 'info']).default('info'),
	/** Duration in milliseconds to show the notification (0 = permanent) */
	duration: z.number().min(0).default(3000).optional(),
});

export type NotificationAction = z.infer<typeof NotificationActionSchema>;

// Module augmentation to add notification action to PluginActions
declare module '../types' {
	interface PluginActions {
		show_notification: NotificationAction;
	}
}

/**
 * Notification Plugin Factory
 *
 * Returns a configured action registration object that you can register when needed.
 *
 * @example Basic Console Notifications
 * ```typescript
 * import { notificationPlugin } from "@/actions/plugins";
 * import { registerAction } from "@/actions/action-registry";
 *
 * const notificationAction = notificationPlugin({
 *   onSuccess: (message) => console.log("✅", message),
 *   onError: (message) => console.error("❌", message)
 * });
 *
 * // Register when you need it
 * registerAction(notificationAction);
 * ```
 *
 * @example Toast Integration
 * ```typescript
 * const toastNotifications = notificationPlugin({
 *   onSuccess: (message) => toast.success(message),
 *   onError: (message) => toast.error(message),
 *   onWarning: (message) => toast.warning(message),
 *   onInfo: (message) => toast.info(message)
 * });
 *
 * registerAction(toastNotifications);
 * ```
 *
 * @example Multiple Configurations
 * ```typescript
 * // Different configurations for different forms
 * const marketingNotifications = notificationPlugin({
 *   onSuccess: (message) => {
 *     toast.success(message);
 *     analytics.track('marketing_form_success');
 *   }
 * });
 *
 * const accountNotifications = notificationPlugin({
 *   onSuccess: (message) => showAccountDialog(message, 'success')
 * });
 *
 * // Register based on context
 * if (isMarketingForm) {
 *   registerAction(marketingNotifications);
 * } else {
 *   registerAction(accountNotifications);
 * }
 * ```
 */
export function notificationPlugin(config: NotificationPluginConfig = {}) {
	return {
		type: 'show_notification' as const,
		schema: NotificationActionSchema,
		defaultTriggers: ['submit_success', 'submit_error'] as const,
		handler: async (
			action: NotificationAction,
			context: ActionExecutionContext,
		): Promise<ActionExecutionResult> => {
			try {
				const { message, variant } = action;

				if (config.onNotification) {
					await config.onNotification(message, variant, context);
				} else {
					switch (variant) {
						case 'success':
							if (config.onSuccess) {
								await config.onSuccess(message, context);
							} else {
								console.log('success', { formId: context.formId, message });
							}
							break;
						case 'error':
							if (config.onError) {
								await config.onError(message, context);
							} else {
								console.error('error', { formId: context.formId, message });
							}
							break;
						case 'warning':
							if (config.onWarning) {
								await config.onWarning(message, context);
							} else {
								console.warn('warning', { formId: context.formId, message });
							}
							break;
						case 'info':
							if (config.onInfo) {
								await config.onInfo(message, context);
							} else {
								console.info('info', { formId: context.formId, message });
							}
							break;
					}
				}

				return {
					success: true,
					message: `Notification '${message}' shown`,
					shouldContinue: true,
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to show notification',
					shouldContinue: true,
				};
			}
		},
	};
}
