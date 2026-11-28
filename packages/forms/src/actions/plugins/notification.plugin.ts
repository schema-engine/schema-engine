import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext, BuilderActionRegistration, BuilderActionConfig } from '@/types/index.js';
import { logger } from '@/lib/logger.js';

/**
 * Notification Plugin Configuration
 */
export interface NotificationPluginConfig {
	/** Custom success handler */
	onSuccess?: (message: string, context: BuilderActionRuntimeContext<NotificationAction>) => void | Promise<void>;
	/** Custom error handler */
	onError?: (message: string, context: BuilderActionRuntimeContext<NotificationAction>) => void | Promise<void>;
	/** Custom warning handler */
	onWarning?: (message: string, context: BuilderActionRuntimeContext<NotificationAction>) => void | Promise<void>;
	/** Custom info handler */
	onInfo?: (message: string, context: BuilderActionRuntimeContext<NotificationAction>) => void | Promise<void>;
	/** Global handler for all notification types */
	onNotification?: (
		message: string,
		variant: NotificationAction['variant'],
		context: BuilderActionRuntimeContext<NotificationAction>,
	) => void | Promise<void>;
}

/** Schema for the `show_notification` action configuration. */
export const NotificationActionSchema = z.object({
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
	/** Message to display in the notification */
	message: z.string().check(z.minLength(1, 'Message cannot be empty')),
	/** Visual style of the notification */
	variant: z._default(z.enum(['success', 'error', 'warning', 'info']), 'info'),
	/** Duration in milliseconds to show the notification (0 = permanent) */
	duration: z.optional(z._default(z.number().check(z.gte(0)), 3000)),
});

export type NotificationAction = BuilderActionConfig<'show_notification', typeof NotificationActionSchema>;

/** Creates a configured `show_notification` action registration. */
export function notificationPlugin(
	config: NotificationPluginConfig = {},
): BuilderActionRegistration<'show_notification', typeof NotificationActionSchema> {
	const handler = async (context: BuilderActionRuntimeContext<NotificationAction>) => {
		const action = context.config;

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
							logger.info('success', { formId: context.formId, message });
						}
						break;
					case 'error':
						if (config.onError) {
							await config.onError(message, context);
						} else {
							logger.error('error', { formId: context.formId, message });
						}
						break;
					case 'warning':
						if (config.onWarning) {
							await config.onWarning(message, context);
						} else {
							logger.warn('warning', { formId: context.formId, message });
						}
						break;
					case 'info':
						if (config.onInfo) {
							await config.onInfo(message, context);
						} else {
							logger.info('info', { formId: context.formId, message });
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
	};

	return {
		$type: 'show_notification',
		schema: NotificationActionSchema,
		metadata: {
			name: 'Show Notification',
			description: 'Display notifications to users with different variants',
			icon: 'bell',
			defaultTriggers: ['form_submit_success', 'form_submit_error'],
		},
		execute: handler,
	};
}
