/**
 * Centralized form engine setup
 * Uses the new Builder Pattern to configure and build the form engine instance
 */

import { createReactFormEngine } from '@json-form-engine/react/registries/builder-registry';

import { InputElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-input.registration';
import { TextareaElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-checkbox.registration';
import { RadioElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-radio.registration';
import { SelectElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-select.registration';
import { SwitchElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-switch.registration';
import { NumberElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-number.registration';
import { ArrayElementRegistration } from '@json-form-engine/react/components/elements/core-ui/inputs/form-array-elements.registration';
import { SubmitButtonElementRegistration } from '@json-form-engine/react/components/elements/core-ui/actions/submit-button.registration';

import { CardLayoutRegistration } from '@json-form-engine/react/components/layouts/card-layout.registration';
import { SplitScreenLayoutRegistration } from '@json-form-engine/react/components/layouts/split-screen-layout.registration';
import { HeroBackgroundLayoutRegistration } from '@json-form-engine/react/components/layouts/hero-background-layout.registration';

import { DefaultStepperRegistration } from '@json-form-engine/react/components/steppers/default-stepper.registration';
import { MinimalistStepperRegistration } from '@json-form-engine/react/components/steppers/minimalist-stepper.registration';
import { DebuggerStepperRegistration } from '@json-form-engine/react/components/steppers/debugger-stepper.registration';

import { submitPlugin, notificationPlugin, resetPlugin, autoSavePlugin } from '@json-form-engine/core/actions';

/**
 * Global form engine instance for the www app
 * All components and demos use this single instance
 */
export const formEngine = createReactFormEngine()
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
		submitPlugin({
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
		resetPlugin({
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
