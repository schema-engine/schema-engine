/**
 * Notification Action Registration
 *
 * Pre-configured notification action with type augmentation.
 * Import this file to register the notification action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { NotificationActionRegistration } from '@schema-engine/forms/actions/plugins/notification-registration';
 * import { FormEngineBuilder } from '@schema-engine/formsuilder';
 *
 * const engine = new FormEngineBuilder()
 *   .addAction(NotificationActionRegistration)
 *   .build();
 * ```
 */

import { notificationPlugin } from './notification-plugin';
import type { NotificationAction } from './notification-plugin';
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
 * Logs notifications to console (override with toast library in your app)
 */
export const NotificationActionRegistration: BuilderActionRegistration<'show_notification', NotificationAction> =
	notificationPlugin({
		onSuccess: (message, context) => {
			console.log(`[Success] ${message}`, { formId: context.formId });
		},
		onError: (message, context) => {
			console.error(`[Error] ${message}`, { formId: context.formId });
		},
		onWarning: (message, context) => {
			console.warn(`[Warning] ${message}`, { formId: context.formId });
		},
		onInfo: (message, context) => {
			console.info(`[Info] ${message}`, { formId: context.formId });
		},
	});
