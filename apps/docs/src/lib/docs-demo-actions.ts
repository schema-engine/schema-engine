import type { ActionRegistrationConstraint } from '@schema-engine/forms';
import {
	autoSavePlugin,
	formResetPlugin,
	formSubmitPlugin,
	gtmPlugin as gtmEventPlugin,
	notificationPlugin,
} from '@schema-engine/forms/actions';

/**
 * Demo action registrations shared by Radiant and Forms React docs previews.
 */
export function createDocsDemoActions(): ActionRegistrationConstraint[] {
	return [
		formSubmitPlugin({
			request: (url, options) => fetch(url, options),
			onSuccess: (data, context) => {
				console.log('[submit] success:', { formId: context.formId, data });
			},
			onError: (error, context) => {
				console.error('[submit] error:', { formId: context.formId, error: error.message });
			},
		}),
		notificationPlugin({
			onSuccess: (message) => console.log(`[success] ${message}`),
			onError: (message) => console.error(`[error] ${message}`),
			onWarning: (message) => console.warn(`[warning] ${message}`),
			onInfo: (message) => console.info(`[info] ${message}`),
		}),
		formResetPlugin({
			onReset: (context) => {
				console.log('[reset] form reset:', { formId: context.formId });
			},
		}),
		autoSavePlugin({
			onSave: (_data, context) => {
				console.log('[autosave] form saved:', { formId: context.formId });
			},
		}),
		gtmEventPlugin(),
	];
}
