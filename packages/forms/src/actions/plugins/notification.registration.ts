/**
 * Notification Action Registration
 *
 * Pre-configured notification action with type augmentation.
 * Import this file to register the notification action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { createFormEngine, NotificationActionRegistration } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   actions: [NotificationActionRegistration],
 * });
 * ```
 */

import { notificationPlugin, NotificationActionSchema, type NotificationAction } from './notification.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			show_notification: NotificationAction;
		}
	}
}

/**
 * Default Notification Action Registration
 * Logs notifications via logger (override with toast library in your app)
 */
export const NotificationActionRegistration: BuilderActionRegistration<
	'show_notification',
	typeof NotificationActionSchema
> = notificationPlugin({
	onSuccess: (message, context) => {
		logger.info(`[Success] ${message}`, { formId: context.formId });
	},
	onError: (message, context) => {
		logger.error(`[Error] ${message}`, { formId: context.formId });
	},
	onWarning: (message, context) => {
		logger.warn(`[Warning] ${message}`, { formId: context.formId });
	},
	onInfo: (message, context) => {
		logger.info(`[Info] ${message}`, { formId: context.formId });
	},
});
