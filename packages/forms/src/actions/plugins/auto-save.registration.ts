/**
 * Auto-Save Action Registration
 *
 * Pre-configured auto-save action with type augmentation.
 * Import this file to register the auto-save action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { AutoSaveActionRegistration } from '@schema-engine/forms/actions/plugins/auto-save-registration';
 * import { FormEngineBuilder } from '@schema-engine/formsuilder';
 *
 * const engine = new FormEngineBuilder()
 *   .addAction(AutoSaveActionRegistration)
 *   .build();
 * ```
 */

import { autoSavePlugin } from './auto-save.plugin';
import type { AutoSaveAction } from './auto-save.plugin';
import type { BuilderActionRegistration } from '@/types';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			auto_save: AutoSaveAction;
		}
	}
}

/**
 * Default Auto-Save Action Registration
 * Saves to localStorage with console logging
 */
export const AutoSaveActionRegistration: BuilderActionRegistration<'auto_save', AutoSaveAction> = autoSavePlugin({
	onSave: (data, context) => {
		console.log('[AutoSave] Form data saved:', { data, formId: context.formId });
	},
	onError: (error, context) => {
		console.error('[AutoSave] Failed to save:', { formId: context.formId, error });
	},
});
