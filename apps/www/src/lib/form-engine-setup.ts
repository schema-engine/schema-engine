/**
 * Centralized form engine setup
 * Uses the new Builder Pattern to configure and build the form engine instance
 */

import { createReactFormEngine } from '@json-form-engine/react/registries/builder-registry';

import { InputElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-input.registration';
import { TextareaElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-checkbox.registration';
import { RadioElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-radio.registration';
import { SelectElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-select.registration';
import { SwitchElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-switch.registration';
import { NumberElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-number.registration';
import { ArrayElementRegistration } from '@json-form-engine/react/components/elements/base-ui/inputs/form-array-elements.registration';
import { SubmitButtonElementRegistration } from '@json-form-engine/react/components/elements/base-ui/actions/submit-button.registration';

import { CardLayoutRegistration } from '@json-form-engine/react/components/layouts/card-layout';
import { SplitScreenLayoutRegistration } from '@json-form-engine/react/components/layouts/split-screen-layout';
import { HeroBackgroundLayoutRegistration } from '@json-form-engine/react/components/layouts/hero-background-layout';

import { DefaultStepperRegistration } from '@json-form-engine/react/components/steppers/default-stepper';
import { MinimalistStepperRegistration } from '@json-form-engine/react/components/steppers/minimalist-stepper';
import { DebuggerStepperRegistration } from '@json-form-engine/react/components/steppers/debugger-stepper';

import { submitPlugin, notificationPlugin, resetPlugin, autoSavePlugin } from '@json-form-engine/core/actions';

import type { InputFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-input.types';
import type { TextareaFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-textarea.types';
import type { CheckboxFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-checkbox.types';
import type { RadioFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-radio.types';
import type { SelectFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-select.types';
import type { SwitchFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-switch.types';
import type { NumberFieldConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-number.types';
import type { ArrayElementsConfig } from '@json-form-engine/react/components/elements/base-ui/inputs/form-array-elements.types';
import type { SubmitButtonConfig } from '@json-form-engine/react/components/elements/base-ui/actions/submit-button.types';

import type { CardLayoutConfig } from '@json-form-engine/react/components/layouts/card-layout.types';
import type { SplitScreenLayoutConfig } from '@json-form-engine/react/components/layouts/split-screen-layout.types';
import type { HeroBackgroundLayoutConfig } from '@json-form-engine/react/components/layouts/hero-background-layout.types';

import type { DefaultStepperConfig } from '@json-form-engine/react/components/steppers/default-stepper.types';
import type { MinimalistStepperConfig } from '@json-form-engine/react/components/steppers/minimalist-stepper.types';
import type { DebuggerStepperConfig } from '@json-form-engine/react/components/steppers/debugger-stepper.types';

/**
 * Global form engine instance for the www app
 * All components and demos use this single instance
 */
export const formEngine = createReactFormEngine()
	.addElement<'input', InputFieldConfig>(InputElementRegistration)
	.addElement<'textarea', TextareaFieldConfig>(TextareaElementRegistration)
	.addElement<'checkbox', CheckboxFieldConfig>(CheckboxElementRegistration)
	.addElement<'radio', RadioFieldConfig>(RadioElementRegistration)
	.addElement<'select', SelectFieldConfig>(SelectElementRegistration)
	.addElement<'switch', SwitchFieldConfig>(SwitchElementRegistration)
	.addElement<'number', NumberFieldConfig>(NumberElementRegistration)
	.addElement<'array', ArrayElementsConfig>(ArrayElementRegistration)
	.addElement<'submit', SubmitButtonConfig>(SubmitButtonElementRegistration)
	.addLayout<'card', CardLayoutConfig>(CardLayoutRegistration)
	.addLayout<'split-screen', SplitScreenLayoutConfig>(SplitScreenLayoutRegistration)
	.addLayout<'hero-background', HeroBackgroundLayoutConfig>(HeroBackgroundLayoutRegistration)
	.addStepper<'default', DefaultStepperConfig>(DefaultStepperRegistration)
	.addStepper<'minimalist', MinimalistStepperConfig>(MinimalistStepperRegistration)
	.addStepper<'debugger', DebuggerStepperConfig>(DebuggerStepperRegistration)
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
