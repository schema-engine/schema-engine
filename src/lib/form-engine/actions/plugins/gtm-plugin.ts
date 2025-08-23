import { z } from "zod";
import { registerAction } from "../action-registry";
import type { ActionExecutionContext, ActionExecutionResult } from "../types";
import { GTMTracker } from "../../gtm-tracker";

/**
 * GTM Event Action Schema
 *
 * Pushes analytics events to Google Tag Manager with optional form data inclusion.
 * Supports specific trigger filtering to control when events are fired.
 *
 * @example Basic GTM Event
 * ```typescript
 * {
 *   id: "form-start-tracking",
 *   type: "gtm_event",
 *   eventName: "form_start",
 *   eventData: {
 *     form_type: "contact",
 *     page_section: "footer"
 *   },
 *   includeFormData: false,
 *   triggers: ["form_start"]
 * }
 * ```
 *
 * @example With Form Data Inclusion
 * ```typescript
 * {
 *   id: "submit-tracking",
 *   type: "gtm_event",
 *   eventName: "form_submit_success",
 *   eventData: { conversion_event: true },
 *   includeFormData: ["email", "user_type"], // Only specific fields
 *   triggers: ["form_submit"]
 * }
 * ```
 */
export const GTMEventActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().min(1, "Action ID cannot be empty"),
	/** Action type identifier */
	type: z.literal("gtm_event"),
	/** Optional description for documentation and debugging purposes */
	description: z.string().optional(),
	/** Whether this action is enabled and should be executed */
	enabled: z.boolean().default(true),
	/** Name of the GTM event to push to dataLayer */
	eventName: z.string().min(1, "Event name cannot be empty"),
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
			z.array(z.string().min(1, "Field name cannot be empty")), // array = specific fields
		])
		.default(false),
	/**
	 * Optional specific triggers for this GTM event.
	 * If not provided, uses default GTM trigger mapping.
	 * Allows fine-grained control over when events fire.
	 */
	triggers: z
		.array(
			z.enum([
				"form_start",
				"form_change",
				"form_submit",
				"step_change",
				"step_submit",
				"step_enter",
				"step_leave",
				"step_view",
				"manual_save",
				"manual_reset",
			])
		)
		.optional(),
});

export type GTMEventAction = z.infer<typeof GTMEventActionSchema>;

// Module augmentation to add GTM action to PluginActions
declare module "../types" {
	interface PluginActions {
		gtm_event: GTMEventAction;
	}
}

// Register the GTM event action
registerAction({
	type: "gtm_event",
	schema: GTMEventActionSchema,
	defaultTriggers: ["form_start", "form_submit", "step_change", "step_submit"],
	handler: async (
		action: GTMEventAction,
		context: ActionExecutionContext
	): Promise<ActionExecutionResult> => {
		try {
			const eventData: Record<string, any> = {
				...action.eventData,
				form_id: context.formId,
				current_step: context.currentStep,
				total_steps: context.totalSteps,
				is_valid: context.isValid,
				...context.metadata,
			};

			// Handle form data inclusion
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

			GTMTracker.push(action.eventName, eventData);

			return {
				success: true,
				message: `GTM event '${action.eventName}' pushed successfully`,
				shouldContinue: true,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "GTM event push failed",
				shouldContinue: true,
			};
		}
	},
});
