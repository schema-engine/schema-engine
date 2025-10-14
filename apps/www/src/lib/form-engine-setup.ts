/**
 * Centralized form engine setup
 * Uses the new Builder Pattern to configure and build the form engine instance
 */

import { createReactFormEngine } from '@json-form-engine/react/registries/builder-registry';

/**
 * Element Registrations (with type augmentation)
 * Importing these registers the types in FormEngine.ElementRegistry
 */
import {
	InputElementRegistration,
	TextareaElementRegistration,
	CheckboxElementRegistration,
	RadioElementRegistration,
	SelectElementRegistration,
	SwitchElementRegistration,
	NumberElementRegistration,
	ArrayElementRegistration,
	SubmitButtonElementRegistration,
} from '@json-form-engine/react/registrations';

/**
 * Layout Registrations (with type augmentation)
 * Importing these registers the types in FormEngine.LayoutRegistry
 */
import {
	CardLayoutRegistration,
	SplitScreenLayoutRegistration,
	HeroBackgroundLayoutRegistration,
} from '@json-form-engine/react/registrations';

/**
 * Stepper Registrations (with type augmentation)
 * Importing these registers the types in FormEngine.StepperRegistry
 */
import {
	DefaultStepperRegistration,
	MinimalistStepperRegistration,
	DebuggerStepperRegistration,
} from '@json-form-engine/react/registrations';

/**
 * Action Registrations (with type augmentation)
 * Importing these registers the types in FormEngine.ActionRegistry
 * Note: These imports are needed for type augmentation side effects
 */
// biome-ignore lint/correctness/noUnusedImports: needed for type augmentation
import { SubmitActionRegistration } from '@json-form-engine/core/actions/plugins/submit-registration';
// biome-ignore lint/correctness/noUnusedImports: needed for type augmentation
import { NotificationActionRegistration } from '@json-form-engine/core/actions/plugins/notification-registration';
// biome-ignore lint/correctness/noUnusedImports: needed for type augmentation
import { ResetActionRegistration } from '@json-form-engine/core/actions/plugins/reset-registration';
// biome-ignore lint/correctness/noUnusedImports: needed for type augmentation
import { AutoSaveActionRegistration } from '@json-form-engine/core/actions/plugins/auto-save-registration';

// Import plugin factories for custom configuration
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
				console.log('✅ Form submitted successfully:', { formId: context.formId, data });
			},
			onError: (error, context) => {
				console.error('❌ Form submission failed:', { formId: context.formId, error: error.message });
			},
		}),
	)
	.addAction(
		notificationPlugin({
			onSuccess: (message) => console.log(`✅ ${message}`),
			onError: (message) => console.error(`❌ ${message}`),
			onWarning: (message) => console.warn(`⚠️ ${message}`),
			onInfo: (message) => console.info(`ℹ️ ${message}`),
		}),
	)
	.addAction(
		resetPlugin({
			onReset: (context) => {
				console.log('🔄 Form reset:', { formId: context.formId });
			},
		}),
	)
	.addAction(
		autoSavePlugin({
			onSave: (_data, context) => {
				console.log('💾 Form auto-saved:', { formId: context.formId });
			},
		}),
	)
	.build();
