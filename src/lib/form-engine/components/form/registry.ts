import '@/lib/form-engine/components/form/fields/form-array-elements.registry';
import '@/lib/form-engine/components/form/fields/form-checkbox.registry';
import '@/lib/form-engine/components/form/fields/form-input.registry';
import '@/lib/form-engine/components/form/fields/form-number.registry';
import '@/lib/form-engine/components/form/fields/form-radio.registry';
import '@/lib/form-engine/components/form/fields/form-select.registry';
import '@/lib/form-engine/components/form/fields/form-textarea.registry';
import '@/lib/form-engine/components/form/fields/form-switch.registry';

import { registerAction } from '@/lib/form-engine/actions/action-registry';
import { submitPlugin, resetPlugin, notificationPlugin, autoSavePlugin } from '@/lib/form-engine/actions/plugins';

registerAction(
	submitPlugin({
		onSuccess: (data, context) => {
			console.log('Form submitted successfully:', { formId: context.formId, data });
		},
		onError: (error, context) => {
			console.error('Form submission failed:', { formId: context.formId, error });
		},
	}),
);

registerAction(
	resetPlugin({
		onReset: (context) => {
			console.log('Form reset:', { formId: context.formId });
		},
	}),
);

registerAction(
	notificationPlugin({
		onSuccess: (message) => console.log('Success:', message),
		onError: (message) => console.error('Error:', message),
		onWarning: (message) => console.warn('Warning:', message),
		onInfo: (message) => console.info('Info:', message),
	}),
);

registerAction(
	autoSavePlugin({
		onSave: (data, context) => {
			console.log('Auto-save:', { formId: context.formId, data });
		},
	}),
);
