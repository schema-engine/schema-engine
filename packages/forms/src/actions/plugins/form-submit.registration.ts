/**
 * Submit Action Registration
 *
 * Pre-configured submit action with type augmentation.
 * Import this file to register the submit action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { createFormEngine, SubmitActionRegistration } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   actions: [SubmitActionRegistration],
 * });
 * ```
 */

import { formSubmitPlugin, FormSubmitActionSchema, type FormSubmitAction } from './form-submit.plugin';
import { logger } from '@/lib/logger';
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
 * Handles basic form submission with logger output
 */
export const SubmitActionRegistration: BuilderActionRegistration<'submit', typeof FormSubmitActionSchema> =
	formSubmitPlugin({
		onSuccess: (data, context) => {
			logger.info('[Submit] Form submitted successfully:', { formId: context.formId, data });
		},
		onError: (error, context) => {
			logger.error('[Submit] Form submission failed:', {
				formId: context.formId,
				error: error.message,
			});
		},
	});
