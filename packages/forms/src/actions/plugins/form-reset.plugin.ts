import * as z from 'zod/mini';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
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

/** Schema for the `reset` action configuration. */
export const FormResetActionSchema = z.object({
	id: z.string().check(z.minLength(1, 'Action ID cannot be empty')),
	$type: z.literal('reset'),
	description: z.optional(z.string()),
	enabled: z._default(z.boolean(), true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.optional(z.array(FormActionTriggerSchema)),
	confirmMessage: z.optional(z.string()),
	resetToDefaults: z._default(z.boolean(), true),
});

export type FormResetAction = z.infer<typeof FormResetActionSchema>;

/**
 * Default form reset implementation using React Hook Form methods
 */
function defaultResetForm(context: BuilderActionExecutionContext<any>, _resetToDefaults: boolean) {
	context.form.reset();
}

/** Creates a configured `reset` action registration. */
export function formResetPlugin(
	config: FormResetPluginConfig = {},
): BuilderActionRegistration<'reset', typeof FormResetActionSchema> {
	const {
		confirm = (message: string) => window.confirm(message),
		clearDraft = (formId: string) => GDPRConsent.hasConsent() && GDPRConsent.clearDraft(formId),
		resetForm = defaultResetForm,
		onReset = () => {},
	} = config;

	return {
		$type: 'reset',
		schema: FormResetActionSchema,
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
