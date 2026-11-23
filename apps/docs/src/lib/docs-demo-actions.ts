import { GDPRConsent, GTMTracker, localStorageAutoSaveStorage } from '@schema-engine/forms/browser';
import {
	type ActionRegistrationConstraint,
	type NotificationAction,
	autoSavePlugin,
	formResetPlugin,
	formSubmitPlugin,
	gtmPlugin as gtmEventPlugin,
	notificationPlugin,
} from '@schema-engine/forms';
import { showDocsActionNotification } from '@/lib/docs-demo-notification';

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
			onNotification: (message, variant, context) => {
				const action = context.config as NotificationAction;
				showDocsActionNotification(message, variant, action.duration ?? 3000);
			},
		}),
		formResetPlugin({
			storage: localStorageAutoSaveStorage,
			onReset: (context) => {
				console.log('[reset] form reset:', { formId: context.formId });
			},
		}),
		autoSavePlugin({
			storage: localStorageAutoSaveStorage,
			shouldSave: () => GDPRConsent.hasConsent(),
			onSave: (_data, context) => {
				console.log('[autosave] form saved:', { formId: context.formId });
			},
		}),
		gtmEventPlugin({
			tracker: {
				push: (eventName, eventData) => GTMTracker.push(eventName, eventData),
			},
		}),
	];
}
