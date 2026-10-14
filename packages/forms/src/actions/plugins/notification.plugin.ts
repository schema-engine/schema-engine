import * as z from 'zod/mini';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
import { logger } from '@/lib/logger';
import { FormActionTriggerSchema } from '../triggers';

/**
 * Notification Plugin Configuration
 */
export interface NotificationPluginConfig {
	/** Custom success handler */
	onSuccess?: (message: string, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
	/** Custom error handler */
	onError?: (message: string, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
	/** Custom warning handler */
	onWarning?: (message: string, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
	/** Custom info handler */
	onInfo?: (message: string, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
	/** Global handler for all notification types */
	onNotification?: (
		message: string,
		variant: string,
		context: BuilderActionExecutionContext<any>,
	) => void | Promise<void>;
}

/** Schema for the `show_notification` action configuration. */
export const NotificationActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().check(z.minLength(1, 'Action ID cannot be empty')),
	/** Action type identifier */
	$type: z.literal('show_notification'),
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
	/** Whether this action is enabled and should be executed */
	enabled: z._default(z.boolean(), true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.optional(z.array(FormActionTriggerSchema)),
	/** Message to display in the notification */
	message: z.string().check(z.minLength(1, 'Message cannot be empty')),
	/** Visual style of the notification */
	variant: z._default(z.enum(['success', 'error', 'warning', 'info']), 'info'),
	/** Duration in milliseconds to show the notification (0 = permanent) */
	duration: z.optional(z._default(z.number().check(z.gte(0)), 3000)),
});

export type NotificationAction = z.infer<typeof NotificationActionSchema>;

/** Creates a configured `show_notification` action registration. */
export function notificationPlugin(
	config: NotificationPluginConfig = {},
): BuilderActionRegistration<'show_notification', typeof NotificationActionSchema> {
	const handler = async (context: BuilderActionExecutionContext<NotificationAction>) => {
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
