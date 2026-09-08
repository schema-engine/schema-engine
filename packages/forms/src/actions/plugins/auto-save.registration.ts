/**
 * Auto-Save Action Registration
 *
 * Pre-configured auto-save action with type augmentation.
 * Import this file to register the auto-save action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { createFormEngine, AutoSaveActionRegistration } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   actions: [AutoSaveActionRegistration],
 * });
 * ```
 */

import { autoSavePlugin, AutoSaveActionSchema, type AutoSaveAction } from './auto-save.plugin';
import { logger } from '@/lib/logger';
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
 * Saves to localStorage with logger output
 */
export const AutoSaveActionRegistration: BuilderActionRegistration<'auto_save', typeof AutoSaveActionSchema> =
	autoSavePlugin({
		onSave: (data, context) => {
			logger.info('[AutoSave] Form data saved:', { data, formId: context.formId });
		},
		onError: (error, context) => {
			logger.error('[AutoSave] Failed to save:', { formId: context.formId, error });
		},
	});
