/**
 * Form engine for the docs live previews.
 *
 * All forms-react imports go through `forms-react-host` so the island shares
 * one React instance with FormRenderer.
 */
import {
	ArrayElementRegistration,
	CardLayoutRegistration,
	CheckboxElementRegistration,
	createReactFormComposer,
	DebuggerStepperRegistration,
	DefaultStepperRegistration,
	HeroBackgroundLayoutRegistration,
	InputElementRegistration,
	MinimalistStepperRegistration,
	NumberElementRegistration,
	RadioElementRegistration,
	SelectElementRegistration,
	SplitScreenLayoutRegistration,
	SubmissionAlertElementRegistration,
	SubmitButtonElementRegistration,
	SwitchElementRegistration,
	TextareaElementRegistration,
} from '@/lib/forms-react-host';

import { formSubmitPlugin, notificationPlugin, formResetPlugin, autoSavePlugin } from '@schema-engine/forms/actions';
// oxlint-disable-next-line import/no-unassigned-import -- registers built-in validators
import '@schema-engine/forms/schemas/validation/validation-registry';

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
	.addElement(SubmissionAlertElementRegistration)
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
