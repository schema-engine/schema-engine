import * as z from 'zod/mini';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
import { FormActionTriggerSchema } from '../triggers';

/**
 * GTM Tracker Interface for GTM Plugin
 */
export interface GTMTrackerInterface {
	/** Push event to GTM dataLayer */
	push: (eventName: string, eventData: Record<string, unknown>) => void | Promise<void>;
}

/**
 * GTM Plugin Configuration
 */
export interface GTMPluginConfig {
	/** GTM tracker implementation. Browser implementations live in the browser entry point. */
	tracker: GTMTrackerInterface;
	/** Called when GTM event is pushed successfully */
	onPush?: (
		eventName: string,
		eventData: Record<string, unknown>,
		context: BuilderActionExecutionContext<GTMEventAction>,
	) => void | Promise<void>;
	/** Called when GTM event push fails */
	onError?: (error: string, context: BuilderActionExecutionContext<GTMEventAction>) => void | Promise<void>;
}

/** Schema for the `gtm_event` action configuration. */
export const GTMEventActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().check(z.minLength(1, 'Action ID cannot be empty')),
	/** Action type identifier */
	$type: z.literal('gtm_event'),
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
	/** Whether this action is enabled and should be executed */
	enabled: z._default(z.boolean(), true),
	/** Name of the GTM event to push to dataLayer */
	eventName: z.string().check(z.minLength(1, 'Event name cannot be empty')),
	/** Static data to include with the event */
	eventData: z._default(z.optional(z.record(z.string(), z.unknown())), {}),
	/**
	 * Form data inclusion strategy:
	 * - false: No form data included
	 * - true: All form data included
	 * - string[]: Only specified field names included
	 */
	includeFormData: z._default(
		z.union([z.boolean(), z.array(z.string().check(z.minLength(1, 'Field name cannot be empty')))]),
		false,
	),
	/**
	 * Optional specific triggers for this GTM event.
	 * If not provided, uses default GTM trigger mapping.
	 * Allows fine-grained control over when events fire.
	 */
	triggers: z.optional(z.array(FormActionTriggerSchema)),
});

export type GTMEventAction = z.infer<typeof GTMEventActionSchema>;

/** Creates a configured `gtm_event` action registration. */
export function gtmPlugin(
	config: GTMPluginConfig,
): BuilderActionRegistration<'gtm_event', typeof GTMEventActionSchema> {
	const { tracker } = config;

	return {
		$type: 'gtm_event',
		schema: GTMEventActionSchema,
		metadata: {
			name: 'GTM Event',
			description: 'Push events to Google Tag Manager',
			icon: 'analytics',
			defaultTriggers: ['form_submit', 'form_submit_success'],
		},
		execute: async (context: BuilderActionExecutionContext<GTMEventAction>) => {
			const action = context.config;
			try {
				const eventData: Record<string, unknown> = {
					...action.eventData,
					form_id: context.formId,
					current_step: context.currentStep,
					total_steps: context.totalSteps,
					is_valid: context.isValid,
					...context.metadata,
				};

				if (action.includeFormData === true) {
					eventData.form_data = context.formData;
				} else if (Array.isArray(action.includeFormData)) {
					const selectedData: Record<string, unknown> = {};
					for (const fieldName of action.includeFormData) {
						if (fieldName in context.formData) {
							selectedData[fieldName] = context.formData[fieldName];
						}
					}
					eventData.form_data = selectedData;
				}

				await tracker.push(action.eventName, eventData);

				if (config.onPush) {
					await config.onPush(action.eventName, eventData, context);
				}

				return {
					success: true,
					message: `GTM event '${action.eventName}' pushed successfully`,
					shouldContinue: true,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'GTM event push failed';

				if (config.onError) {
					await config.onError(errorMessage, context);
				}

				return {
					success: false,
					error: errorMessage,
					shouldContinue: true,
				};
			}
		},
	};
}
