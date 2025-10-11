/**
 * GTM Event Action Registration
 *
 * Pre-configured GTM event action with type augmentation.
 * Import this file to register the GTM event action type and get a default configuration.
 *
 * @example
 * ```typescript
 * import { GTMActionRegistration } from '@json-form-engine/core/actions/plugins/gtm-registration';
 * import { FormEngineBuilder } from '@json-form-engine/core/builder';
 *
 * const engine = new FormEngineBuilder()
 *   .addAction(GTMActionRegistration)
 *   .build();
 * ```
 */

import { gtmPlugin } from './gtm-plugin';
import type { GTMEventAction } from './gtm-plugin';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			gtm_event: GTMEventAction;
		}
	}
}

/**
 * Default GTM Action Registration
 * Pushes events to dataLayer with console logging
 */
export const GTMActionRegistration = gtmPlugin({
	onPush: (eventName, eventData, context) => {
		console.log('[GTM] Event pushed:', { eventName, formId: context.formId, eventData });
	},
	onError: (error, context) => {
		console.error('[GTM] Failed to push event:', { formId: context.formId, error });
	},
});
