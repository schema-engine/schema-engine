/**
 * Centralized form engine setup
 * Uses the new Builder Pattern to configure and build the form engine instance
 */

import { createReactFormComposer } from '@schema-engine/forms-react/registries/builder-registry';

import { InputElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-input.registration';
import { TextareaElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-checkbox.registration';
import { RadioElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-radio.registration';
import { SelectElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-select.registration';
import { SwitchElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-switch.registration';
import { NumberElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-number.registration';
import { ArrayElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/inputs/form-array-elements.registration';
import { SubmitButtonElementRegistration } from '@schema-engine/forms-react/components/elements/core-ui/actions/submit-button.registration';

import { CardLayoutRegistration } from '@schema-engine/forms-react/components/layouts/card-layout.registration';
import { SplitScreenLayoutRegistration } from '@schema-engine/forms-react/components/layouts/split-screen-layout.registration';
import { HeroBackgroundLayoutRegistration } from '@schema-engine/forms-react/components/layouts/hero-background-layout.registration';

import { DefaultStepperRegistration } from '@schema-engine/forms-react/components/steppers/default-stepper.registration';
import { MinimalistStepperRegistration } from '@schema-engine/forms-react/components/steppers/minimalist-stepper.registration';
import { DebuggerStepperRegistration } from '@schema-engine/forms-react/components/steppers/debugger-stepper.registration';

import { formSubmitPlugin, notificationPlugin, formResetPlugin, autoSavePlugin } from '@schema-engine/forms/actions';

/**
 * Global form engine instance for the www app
 * All components and demos use this single instance
 */
export const formEngine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addElement(CheckboxElementRegistration)
	.addElement(RadioElementRegistration)
	.addElement(SelectElementRegistration)
	.addElement(SwitchElementRegistration)
	.addElement(NumberElementRegistration)
	.addElement(ArrayElementRegistration)
	.addElement(SubmitButtonElementRegistration)
	.addLayout(CardLayoutRegistration)
	.addLayout(SplitScreenLayoutRegistration)
	.addLayout(HeroBackgroundLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.addStepper(MinimalistStepperRegistration)
	.addStepper(DebuggerStepperRegistration)
	.addAction(
		formSubmitPlugin({
			onSuccess: (data, context) => {
				console.log('[submit] success:', { formId: context.formId, data });
			},
			onError: (error, context) => {
				console.error('[submit] error:', { formId: context.formId, error: error.message });
			},
		}),
	)
	.addAction(
		notificationPlugin({
			onSuccess: (message) => console.log(`[success] ${message}`),
			onError: (message) => console.error(`[error] ${message}`),
			onWarning: (message) => console.warn(`[warning] ${message}`),
			onInfo: (message) => console.info(`[info] ${message}`),
		}),
	)
	.addAction(
		formResetPlugin({
			onReset: (context) => {
				console.log('[reset] form reset:', { formId: context.formId });
			},
		}),
	)
	.addAction(
		autoSavePlugin({
			onSave: (_data, context) => {
				console.log('[autosave] form saved:', { formId: context.formId });
			},
		}),
	)
	.build();
