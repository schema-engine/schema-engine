import { registerAction } from './action-registry';
import { submitPlugin, resetPlugin, notificationPlugin, autoSavePlugin } from './plugins';

registerAction(
	submitPlugin({
		onSuccess: (data, context) => {
			console.log('[submit-plugin] Form submitted successfully:', { formId: context.formId, data });
		},
		onError: (error, context) => {
			console.error('Form submission failed:', { formId: context.formId, error });
		},
	}),
);

registerAction(
	resetPlugin({
		onReset: (context) => {
			console.log('[reset-plugin] Form reset:', { formId: context.formId });
		},
	}),
);

registerAction(
	notificationPlugin({
		onSuccess: (message) => console.log('[notification-plugin] Success:', message),
		onError: (message) => console.error('[notification-plugin] Error:', message),
		onWarning: (message) => console.warn('[notification-plugin] Warning:', message),
		onInfo: (message) => console.info('[notification-plugin] Info:', message),
	}),
);

registerAction(
	autoSavePlugin({
		onSave: (data, context) => {
			console.log('[auto-save-plugin] Auto-save:', { formId: context.formId, data });
		},
	}),
);
