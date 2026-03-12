/**
 * Submit Action Registration
 *
 * Pre-configured submit action with type augmentation.
 * Import this file to register the submit action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { FormComposer, SubmitActionRegistration } from '@schema-engine/forms';
 *
 * const engine = new FormComposer()
 *   .addAction(SubmitActionRegistration)
 *   .build();
 * ```
 */

import { formSubmitPlugin } from './form-submit.plugin';
import type { FormSubmitAction } from './form-submit.plugin';
import type { BuilderActionRegistration } from '@/types';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			submit: FormSubmitAction;
		}
	}
}

/**
 * Default Submit Action Registration
 * Handles basic form submission with console logging
 */
export const SubmitActionRegistration: BuilderActionRegistration<'submit', FormSubmitAction> = formSubmitPlugin({
	onSuccess: (data, context) => {
		console.log('[Submit] Form submitted successfully:', { formId: context.formId, data });
	},
	onError: (error, context) => {
		console.error('[Submit] Form submission failed:', {
			formId: context.formId,
			error: error.message,
		});
	},
});
