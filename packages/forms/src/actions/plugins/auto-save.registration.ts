/**
 * Auto-Save Action Registration
 *
 * Pre-configured auto-save action.
 * Register this declaration on your engine to enable the auto-save action type and get a default configuration.
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

import { autoSavePlugin, AutoSaveActionSchema } from './auto-save.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

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
