/**
 * Submit Action Registration
 *
 * Pre-configured submit action.
 * Register this declaration on your engine to enable the submit action type and get a default configuration.
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

import { formSubmitPlugin, FormSubmitActionSchema } from './form-submit.plugin.js';
import { logger } from '../../lib/logger.js';
import type { BuilderActionRegistration } from '../../types/index.js';

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
