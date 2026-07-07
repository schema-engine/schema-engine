import { z } from 'zod';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
import { asStandardSchema } from '@/lib/standard-schema';
import { FormActionTriggerSchema } from '../triggers';
import { GTMTracker } from '../../tools/gtm-tracker';

/**
 * GTM Tracker Interface for GTM Plugin
 */
export interface GTMTrackerInterface {
	/** Push event to GTM dataLayer */
	push: (eventName: string, eventData: Record<string, any>) => void | Promise<void>;
}

/**
 * GTM Plugin Configuration
 */
export interface GTMPluginConfig {
	/** Custom GTM tracker implementation */
	tracker?: GTMTrackerInterface;
	/** Called when GTM event is pushed successfully */
	onPush?: (
		eventName: string,
		eventData: Record<string, any>,
		context: BuilderActionExecutionContext<any>,
	) => void | Promise<void>;
	/** Called when GTM event push fails */
	onError?: (error: string, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
}

/**
 * GTM Event Action Schema
 *
 * Pushes analytics events to Google Tag Manager with optional form data inclusion.
 * Supports specific trigger filtering to control when events are fired.
 * Configure GTM tracker and handlers using the gtmPlugin() factory function.
 *
 * @example Basic GTM Plugin Setup
 * ```typescript
 * import { gtmPlugin } from "@/actions/plugins";
 * import { registerAction } from "@/actions/action-registry";
 *
 * const gtm = gtmPlugin({
 *   onPush: (eventName, data) => console.log("GTM event:", eventName, data)
 * });
 *
 * registerAction(gtm);
 * ```
 *
 * @example Custom GTM Tracker
 * ```typescript
 * const customGtm = gtmPlugin({
 *   tracker: {
 *     push: async (eventName, eventData) => {
 *       // Custom implementation - e.g., send to multiple analytics services
 *       await Promise.all([
 *         window.dataLayer?.push({ event: eventName, ...eventData }),
 *         fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ eventName, eventData }) })
 *       ]);
 *     }
 *   },
 *   onPush: (eventName, data, context) => {
 *     console.log(`Sent ${eventName} for form ${context.formId}`);
 *   }
 * });
 *
 * registerAction(customGtm);
 * ```
 *
 * @example Form Configuration
 * ```typescript
 * {
 *   id: "form-start-tracking",
 *   $type: "gtm_event",
 *   eventName: "form_mount",
 *   eventData: {
 *     form_type: "contact",
 *     page_section: "footer"
 *   },
 *   includeFormData: false,
 *   triggers: ["form_mount"]
 * }
 * ```
 *
 * @example With Form Data Inclusion
 * ```typescript
 * {
 *   id: "submit-tracking",
 *   $type: "gtm_event",
 *   eventName: "form_submit_success",
 *   eventData: { conversion_event: true },
 *   includeFormData: ["email", "user_type"], // Only specific fields
 *   triggers: ["form_submit_success"]
 * }
 * }
 * ```
 */
export const GTMEventActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().min(1, 'Action ID cannot be empty'),
	/** Action type identifier */
	$type: z.literal('gtm_event'),
	/** Optional description for documentation and debugging purposes */
	description: z.string().optional(),
	/** Whether this action is enabled and should be executed */
	enabled: z.boolean().default(true),
	/** Name of the GTM event to push to dataLayer */
	eventName: z.string().min(1, 'Event name cannot be empty'),
	/** Static data to include with the event */
	eventData: z.record(z.string(), z.any()).optional().default({}),
	/**
	 * Form data inclusion strategy:
	 * - false: No form data included
	 * - true: All form data included
	 * - string[]: Only specified field names included
	 */
	includeFormData: z
		.union([
			z.boolean(), // true = all data, false = no data
			z.array(z.string().min(1, 'Field name cannot be empty')), // array = specific fields
		])
		.default(false),
	/**
	 * Optional specific triggers for this GTM event.
	 * If not provided, uses default GTM trigger mapping.
	 * Allows fine-grained control over when events fire.
	 */
	triggers: z.array(FormActionTriggerSchema).optional(),
});

export type GTMEventAction = z.infer<typeof GTMEventActionSchema>;

const defaultTracker: GTMTrackerInterface = {
	push: (eventName: string, eventData: Record<string, any>) => {
		GTMTracker.push(eventName, eventData);
	},
};

/**
 * GTM Plugin Factory
 *
 * Returns a configured action registration object for pushing events to Google Tag Manager.
 *
 * @example Basic GTM Plugin
 * ```typescript
 * import { gtmPlugin } from "@/actions/plugins";
 * import { registerAction } from "@/actions/action-registry";
 *
 * const gtm = gtmPlugin({
 *   onPush: (eventName, data) => console.log("GTM event pushed:", eventName, data)
 * });
 *
 * registerAction(gtm);
 * ```
 *
 * @example Custom GTM Tracker
 * ```typescript
 * const customGtm = gtmPlugin({
 *   tracker: {
 *     push: async (eventName, eventData) => {
 *       // Send to multiple analytics services
 *       await Promise.all([
 *         window.dataLayer?.push({ event: eventName, ...eventData }),
 *         fetch('/api/analytics', {
 *           method: 'POST',
 *           headers: { 'Content-Type': 'application/json' },
 *           body: JSON.stringify({ eventName, eventData })
 *         })
 *       ]);
 *     }
 *   },
 *   onPush: (eventName, data, context) => {
 *     console.log(`Analytics event sent: ${eventName} for form ${context.formId}`);
 *   },
 *   onError: (error, context) => {
 *     console.error(`GTM error in form ${context.formId}:`, error);
 *   }
 * });
 *
 * registerAction(customGtm);
 * ```
 *
 * @example Debug Mode
 * ```typescript
 * const debugGtm = gtmPlugin({
 *   onPush: (eventName, data, context) => {
 *     if (process.env.NODE_ENV === 'development') {
 *       console.log('GTM Debug:', { eventName, data, formId: context.formId });
 *     }
 *   }
 * });
 * ```
 */
export function gtmPlugin(config: GTMPluginConfig = {}): BuilderActionRegistration<'gtm_event', GTMEventAction> {
	const tracker = config.tracker || defaultTracker;

	return {
		$type: 'gtm_event',
		schema: asStandardSchema(GTMEventActionSchema),
		metadata: {
			name: 'GTM Event',
			description: 'Push events to Google Tag Manager',
			icon: 'analytics',
			defaultTriggers: ['form_submit', 'form_submit_success'],
		},
		execute: async (context: BuilderActionExecutionContext<GTMEventAction>) => {
			const action = context.config;
			try {
				const eventData: Record<string, any> = {
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
					const selectedData: Record<string, any> = {};
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
