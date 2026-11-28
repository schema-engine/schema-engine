import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext, BuilderActionRegistration, BuilderActionConfig } from '../../types/index.js';

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
		context: BuilderActionRuntimeContext<GTMEventAction>,
	) => void | Promise<void>;
	/** Called when GTM event push fails */
	onError?: (error: string, context: BuilderActionRuntimeContext<GTMEventAction>) => void | Promise<void>;
}

/** Schema for the `gtm_event` action configuration. */
export const GTMEventActionSchema = z.object({
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
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
});

export type GTMEventAction = BuilderActionConfig<'gtm_event', typeof GTMEventActionSchema>;

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
		execute: async (context: BuilderActionRuntimeContext<GTMEventAction>) => {
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
