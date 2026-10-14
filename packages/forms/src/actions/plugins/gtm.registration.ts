/**
 * GTM Event Action Registration
 *
 * Pre-configured GTM event action.
 * Register this declaration on your engine to enable the GTM event action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { createFormEngine, GTMActionRegistration } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   actions: [GTMActionRegistration],
 * });
 * ```
 */

import { gtmPlugin, GTMEventActionSchema } from './gtm.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

/**
 * Default GTM Action Registration
 * Pushes events to dataLayer with logger output
 */
export const GTMActionRegistration: BuilderActionRegistration<'gtm_event', typeof GTMEventActionSchema> = gtmPlugin({
	onPush: (eventName, eventData, context) => {
		logger.info('[GTM] Event pushed:', { eventName, formId: context.formId, eventData });
	},
	onError: (error, context) => {
		logger.error('[GTM] Failed to push event:', { formId: context.formId, error });
	},
});
