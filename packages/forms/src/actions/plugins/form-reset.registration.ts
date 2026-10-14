/**
 * Reset Action Registration
 *
 * Pre-configured reset action.
 * Register this declaration on your engine to enable the reset action type and get a default configuration.
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

import { formResetPlugin, FormResetActionSchema } from './form-reset.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

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
