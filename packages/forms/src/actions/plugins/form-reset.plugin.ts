import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext, BuilderActionRegistration, BuilderActionConfig } from '../../types/index.js';
import { getAutoSaveDraftStorageKey, type AutoSaveStorage } from './auto-save.plugin.js';

/**
 * Reset Plugin Configuration
 */
export interface FormResetPluginConfig {
	/** Storage used to remove a form's auto-saved draft. */
	storage: AutoSaveStorage;
	confirm?: (message: string) => boolean | Promise<boolean>;
	clearDraft?: (formId: string) => void | Promise<void>;
	resetForm?: (context: BuilderActionRuntimeContext<FormResetAction>, resetToDefaults: boolean) => void;
	onReset?: (context: BuilderActionRuntimeContext<FormResetAction>) => void;
}

/** Schema for the `reset` action configuration. */
export const FormResetActionSchema = z.object({
	description: z.optional(z.string()),
	confirmMessage: z.optional(z.string()),
	resetToDefaults: z._default(z.boolean(), true),
});

export type FormResetAction = BuilderActionConfig<'reset', typeof FormResetActionSchema>;

/**
 * Default form reset implementation using the form container methods
 */
function defaultResetForm(context: BuilderActionRuntimeContext<FormResetAction>, _resetToDefaults: boolean) {
	context.form.reset();
}

/** Creates a configured `reset` action registration. */
export function formResetPlugin(
	config: FormResetPluginConfig,
): BuilderActionRegistration<'reset', typeof FormResetActionSchema> {
	const {
		storage,
		confirm = () => false,
		clearDraft = (formId: string) => storage.remove(getAutoSaveDraftStorageKey(formId)),
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
		execute: async (context: BuilderActionRuntimeContext<FormResetAction>) => {
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

				await clearDraft(context.formId);
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
