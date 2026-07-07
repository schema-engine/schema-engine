import { z } from 'zod';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
import { asStandardSchema } from '@/lib/standard-schema';
import { FormActionTriggerSchema } from '../triggers';
import { GDPRConsent } from '../../tools/gdpr-consent';

/**
 * Reset Plugin Configuration
 */
export interface FormResetPluginConfig {
	confirm?: (message: string) => boolean | Promise<boolean>;
	clearDraft?: (formId: string) => void;
	resetForm?: (context: BuilderActionExecutionContext<any>, resetToDefaults: boolean) => void;
	onReset?: (context: BuilderActionExecutionContext<any>) => void;
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
export const FormResetActionSchema = z.object({
	id: z.string().min(1, 'Action ID cannot be empty'),
	$type: z.literal('reset'),
	description: z.string().optional(),
	enabled: z.boolean().default(true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.array(FormActionTriggerSchema).optional(),
	confirmMessage: z.string().optional(),
	resetToDefaults: z.boolean().default(true),
});

export type FormResetAction = z.infer<typeof FormResetActionSchema>;

/**
 * Default form reset implementation using React Hook Form methods
 */
function defaultResetForm(context: BuilderActionExecutionContext<any>, _resetToDefaults: boolean) {
	context.form.reset();
}

/**
 * Reset Plugin Factory
 *
 * Returns a configured action registration object for form reset functionality.
 *
 * @example Builder Usage
 * ```typescript
 * import { resetPlugin } from "@/actions/plugins";
 * import { FormComposer } from "@/builder";
 *
 * const engine = new FormComposer()
 *   .addAction(resetPlugin({
 *     confirm: (message) => window.confirm(message),
 *     onReset: (context) => {
 *       console.log("Form reset:", context.formId);
 *       analytics.track("form_reset", { formId: context.formId });
 *     }
 *   }))
 *   .build();
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
export function formResetPlugin(
	config: FormResetPluginConfig = {},
): BuilderActionRegistration<'reset', FormResetAction> {
	const {
		confirm = (message: string) => window.confirm(message),
		clearDraft = (formId: string) => GDPRConsent.hasConsent() && GDPRConsent.clearDraft(formId),
		resetForm = defaultResetForm,
		onReset = () => {},
	} = config;

	return {
		$type: 'reset',
		schema: asStandardSchema(FormResetActionSchema),
		metadata: {
			name: 'Reset Form',
			description: 'Reset form to initial state or defaults',
			icon: 'refresh',
			defaultTriggers: ['form_submit_success'],
		},
		execute: async (context: BuilderActionExecutionContext<FormResetAction>) => {
			const action = context.config;
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
