/**
 * Notification Action Registration
 *
 * Pre-configured notification action.
 * Register this declaration on your engine to enable the notification action type and get a default configuration.
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

import { notificationPlugin, NotificationActionSchema } from './notification.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

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
