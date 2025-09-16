import './fields/form-checkbox.registry';
import './fields/form-input.registry';
import './fields/form-number.registry';
import './fields/form-radio.registry';
import './fields/form-select.registry';
import './fields/form-textarea.registry';
import './fields/form-switch.registry';
import './fields/form-array-elements.registry';

import type { InputFieldConfig } from './fields/form-input.types';
import type { TextareaFieldConfig } from './fields/form-textarea.types';
import type { CheckboxFieldConfig } from './fields/form-checkbox.types';
import type { NumberFieldConfig } from './fields/form-number.types';
import type { RadioFieldConfig } from './fields/form-radio.types';
import type { SelectFieldConfig } from './fields/form-select.types';
import type { SwitchFieldConfig } from './fields/form-switch.types';
import type { ArrayElementsConfig } from './fields/form-array-elements.types';

import { registerAction } from '@json-form-engine/core/actions/action-registry';
import { submitPlugin, resetPlugin, notificationPlugin, autoSavePlugin } from '@json-form-engine/core/actions';

declare global {
	namespace FormEngine {
		interface FieldConfigRegistry {
			input: InputFieldConfig;
			textarea: TextareaFieldConfig;
			checkbox: CheckboxFieldConfig;
			number: NumberFieldConfig;
			radio: RadioFieldConfig;
			select: SelectFieldConfig;
			switch: SwitchFieldConfig;
			arrayElements: ArrayElementsConfig;
		}
	}
}

declare module '@json-form-engine/react' {
	namespace FormEngine {
		interface FieldConfigRegistry {
			input: InputFieldConfig;
			textarea: TextareaFieldConfig;
			checkbox: CheckboxFieldConfig;
			number: NumberFieldConfig;
			radio: RadioFieldConfig;
			select: SelectFieldConfig;
			switch: SwitchFieldConfig;
			arrayElements: ArrayElementsConfig;
		}
	}
}

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
