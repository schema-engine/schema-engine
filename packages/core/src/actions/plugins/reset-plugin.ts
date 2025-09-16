import { z } from 'zod';
import type { ActionExecutionContext, ActionExecutionResult } from '../types';
import { ActionTriggerSchema } from '../triggers';
import { GDPRConsent } from '../../tools/gdpr-consent';

/**
 * Reset Plugin Configuration
 */
export interface ResetPluginConfig {
	confirm?: (message: string) => boolean | Promise<boolean>;
	clearDraft?: (formId: string) => void;
	resetForm?: (context: ActionExecutionContext, resetToDefaults: boolean) => void;
	onReset?: (context: ActionExecutionContext) => void;
}

/**
 * Reset Action Schema
 *
 * Resets form to initial state with optional user confirmation.
 * Clears all form data, validation errors, and draft storage.
 * Configure behavior using the resetPlugin() factory function.
 *
 * @example Basic Reset
 * ```typescript
 * resetPlugin({
 *   confirm: (message) => window.confirm(message),
 *   onReset: (context) => console.log("Form reset:", context.formId)
 * });
 * ```
 */
export const ResetActionSchema = z.object({
	id: z.string().min(1, 'Action ID cannot be empty'),
	type: z.literal('reset'),
	description: z.string().optional(),
	enabled: z.boolean().default(true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.array(ActionTriggerSchema).optional(),
	confirmMessage: z.string().optional(),
	resetToDefaults: z.boolean().default(true),
});

export type ResetAction = z.infer<typeof ResetActionSchema>;

declare module '../types' {
	interface PluginActions {
		reset: ResetAction;
	}
}

/**
 * Default form reset implementation using React Hook Form methods
 */
function defaultResetForm(context: ActionExecutionContext, resetToDefaults: boolean) {
	if (resetToDefaults) {
		context.form.reset();
	} else {
		context.form.reset({});
	}
}

/**
 * Reset Plugin Factory
 *
 * Returns a configured action registration object for form reset functionality.
 *
 * @example Basic Reset
 * ```typescript
 * import { resetPlugin } from "@/actions/plugins";
 * import { registerAction } from "@/actions/action-registry";
 *
 * const reset = resetPlugin({
 *   confirm: (message) => window.confirm(message),
 *   onReset: (context) => {
 *     console.log("Form reset:", context.formId);
 *     analytics.track("form_reset", { formId: context.formId });
 *   }
 * });
 *
 * registerAction(reset);
 * ```
 *
 * @example Custom Confirmation Dialog
 * ```typescript
 * import Swal from 'sweetalert2';
 *
 * const sweetReset = resetPlugin({
 *   confirm: async (message) => {
 *     const result = await Swal.fire({
 *       title: 'Reset Form?',
 *       text: message,
 *       icon: 'warning',
 *       showCancelButton: true,
 *       confirmButtonText: 'Yes, reset it!'
 *     });
 *     return result.isConfirmed;
 *   },
 *   clearDraft: (formId) => {
 *     localStorage.removeItem(`draft_${formId}`);
 *     api.deleteDraft(formId);
 *   },
 *   onReset: (context) => {
 *     toast.success("Form has been reset");
 *   }
 * });
 * ```
 */
export function resetPlugin(config: ResetPluginConfig = {}) {
	const {
		confirm = (message: string) => window.confirm(message),
		clearDraft = (formId: string) => GDPRConsent.hasConsent() && GDPRConsent.clearDraft(formId),
		resetForm = defaultResetForm,
		onReset = () => {},
	} = config;

	return {
		type: 'reset' as const,
		schema: ResetActionSchema,
		defaultTriggers: ['manual_reset', 'submit_success'] as const,
		handler: async (action: ResetAction, context: ActionExecutionContext): Promise<ActionExecutionResult> => {
			try {
				if (action.confirmMessage) {
					const confirmed = await confirm(action.confirmMessage);
					if (!confirmed) {
						return {
							success: false,
							error: 'Reset cancelled by user',
							shouldContinue: true,
						};
					}
				}

				clearDraft(context.formId);
				resetForm(context, action.resetToDefaults);
				onReset(context);

				return {
					success: true,
					message: 'Form reset successfully',
					shouldContinue: true,
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Reset failed',
					shouldContinue: true,
				};
			}
		},
	};
}
