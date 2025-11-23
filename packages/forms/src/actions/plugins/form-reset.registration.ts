/**
 * Reset Action Registration
 *
 * Pre-configured reset action with type augmentation.
 * Import this file to register the reset action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { ResetActionRegistration } from '@schema-engine/forms/actions/plugins/reset-registration';
 * import { FormEngineBuilder } from '@schema-engine/formsuilder';
 *
 * const engine = new FormEngineBuilder()
 *   .addAction(ResetActionRegistration)
 *   .build();
 * ```
 */

import { formResetPlugin } from './form-reset.plugin';
import type { FormResetAction } from './form-reset.plugin';
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
export const ResetActionRegistration: BuilderActionRegistration<'reset', FormResetAction> = formResetPlugin({
	confirm: (message) => window.confirm(message),
	onReset: (context) => {
		console.log('[Reset] Form reset completed:', { formId: context.formId });
	},
});
