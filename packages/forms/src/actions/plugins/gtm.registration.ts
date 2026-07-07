/**
 * GTM Event Action Registration
 *
 * Pre-configured GTM event action with type augmentation.
 * Import this file to register the GTM event action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { FormComposer, GTMActionRegistration } from '@schema-engine/forms';
 *
 * const engine = new FormComposer()
 *   .addAction(GTMActionRegistration)
 *   .build();
 * ```
 */

import { gtmPlugin } from './gtm.plugin';
import type { GTMEventAction } from './gtm.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			gtm_event: GTMEventAction;
		}
	}
}

/**
 * Default GTM Action Registration
 * Pushes events to dataLayer with logger output
 */
export const GTMActionRegistration: BuilderActionRegistration<'gtm_event', GTMEventAction> = gtmPlugin({
	onPush: (eventName, eventData, context) => {
		logger.info('[GTM] Event pushed:', { eventName, formId: context.formId, eventData });
	},
	onError: (error, context) => {
		logger.error('[GTM] Failed to push event:', { formId: context.formId, error });
	},
});
