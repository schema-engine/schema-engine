/**
 * Reset Action Registration
 *
 * Pre-configured reset action with type augmentation.
 * Import this file to register the reset action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { createFormEngine, ResetActionRegistration } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   actions: [ResetActionRegistration],
 * });
 * ```
 */

import { formResetPlugin, FormResetActionSchema, type FormResetAction } from './form-reset.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			reset: FormResetAction;
		}
	}
}

/**
 * Default Reset Action Registration
 * Resets form with browser confirmation
 */
export const ResetActionRegistration: BuilderActionRegistration<'reset', typeof FormResetActionSchema> =
	formResetPlugin({
		confirm: (message) => window.confirm(message),
		onReset: (context) => {
			logger.info('[Reset] Form reset completed:', { formId: context.formId });
		},
	});
