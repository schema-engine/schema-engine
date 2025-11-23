/**
 * Submit Action Registration
 *
 * Pre-configured submit action with type augmentation.
 * Import this file to register the submit action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { SubmitActionRegistration } from '@schema-engine/forms/actions/plugins/submit-registration';
 * import { FormEngineBuilder } from '@schema-engine/formsuilder';
 *
 * const engine = new FormEngineBuilder()
 *   .addAction(SubmitActionRegistration)
 *   .build();
 * ```
 */

import { submitPlugin } from './submit-plugin';
import type { SubmitAction } from './submit-plugin';
import type { BuilderActionRegistration } from '@/types';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: SubmitAction;
		}
	}
}

/**
 * Default Submit Action Registration
 * Handles basic form submission with console logging
 */
export const SubmitActionRegistration: BuilderActionRegistration<'submit', SubmitAction> = submitPlugin({
	onSuccess: (data, context) => {
		console.log('[Submit] Form submitted successfully:', { formId: context.formId, data });
	},
	onError: (error, context) => {
		console.error('[Submit] Form submission failed:', { formId: context.formId, error: error.message });
	},
});
