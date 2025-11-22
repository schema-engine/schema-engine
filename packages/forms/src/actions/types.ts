import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
import type { FormActionTrigger } from './triggers';
import { SubmitActionSchema } from './plugins/submit-plugin';
import { ResetActionSchema } from './plugins/reset-plugin';
import { NotificationActionSchema } from './plugins/notification-plugin';
import { AutoSaveActionSchema } from './plugins/auto-save-plugin';
import { GTMEventActionSchema } from './plugins/gtm-plugin';

/**
 * Global Action Registry
 *
 * Extension point for registering custom action types via global namespace augmentation.
 * External packages can extend this interface to add their action schemas.
 *
 * To register actions, import the registration file which includes type augmentation:
 * @example
 * ```typescript
 * import { SubmitActionRegistration } from '@schema-engine/forms/actions/plugins/submit-registration';
 * // The import above automatically augments FormEngine.ActionRegistry with 'submit' type
 * ```
 *
 * For custom actions:
 * @example
 * ```typescript
 * declare global {
 *   namespace FormEngine {
 *     interface ActionRegistry {
 *       my_custom_action: MyCustomid;
 *     }
 *   }
 * }
 * ```
 */
declare global {
	namespace FormEngine {
		interface ActionRegistry {}
	}
}

/**
 * Form Action Configuration Union
 *
 * Union of all registered action types from FormEngine.ActionRegistry.
 * TypeScript can automatically infer the correct action type based on the 'type' field.
 *
 * @example Type Narrowing
 * ```typescript
 * function handleAction(action: FormActionConfig) {
 *   if (action.type === "submit") {
 *     // action is automatically typed as SubmitAction (if submit registration is imported)
 *   }
 * }
 * ```
 */
export type FormActionConfig = FormEngine.ActionRegistry[keyof FormEngine.ActionRegistry];

/**
 * Action Execution Context
 *
 * Comprehensive context object passed to all action handlers.
 * Contains form state, metadata, and execution context information.
 *
 * @example Context Usage
 * ```typescript
 * async function executeAction(action: FormActionConfig, context: ActionExecutionContext) {
 *   const { formData, isValid, currentStep, metadata, form } = context;
 *
 *   if (!isValid && action.type === "submit") {
 *     return { success: false, error: "Form validation failed" };
 *   }
 *
 *   // Reset form using React Hook Form methods
 *   form.reset();
 * }
 * ```
 */
export interface ActionExecutionContext {
	formId: string;
	formData: Record<string, any>;
	currentStep: number;
	totalSteps: number;
	isValid: boolean;
	errors: Record<string, any>;
	form: UseFormReturn<any>;
	metadata: {
		stepStartTime: number;
		totalFormTime: number;
		userInteractions: number;
	};
}

/**
 * Action Execution Result
 *
 * Standardized return type for all action executors.
 * Provides success status, messages, data, and flow control information.
 *
 * @example Success Result
 * ```typescript
 * return {
 *   success: true,
 *   message: "Action completed successfully",
 *   data: { submissionId: "abc123" },
 *   shouldContinue: true
 * };
 * ```
 *
 * @example Error Result
 * ```typescript
 * return {
 *   success: false,
 *   error: "Validation failed",
 *   shouldContinue: false // Stop further action execution
 * };
 * ```
 */
export interface ActionExecutionResult {
	/** Whether the action executed successfully */
	success: boolean;
	/** Success message to display or log */
	message?: string;
	/** Error message if action failed */
	error?: string;
	/** Data returned by the action (e.g., API response) */
	data?: any;
	/** Whether to continue executing subsequent actions */
	shouldContinue?: boolean;
	/** URL to redirect to after action completion */
	redirectUrl?: string;
}

/**
 * Action Handler Function Type
 *
 * Function signature for action handlers that execute specific action types.
 */
export type ActionHandler<T extends Record<string, any> = any> = (
	action: T,
	context: ActionExecutionContext,
) => Promise<ActionExecutionResult> | ActionExecutionResult;

/**
 * Registered Action Configuration
 *
 * Configuration object for registering actions in the action registry.
 * Used by plugin factories to define action behavior.
 */
export interface RegisteredAction {
	/** Action type identifier */
	type: string;
	/** Zod schema for validating action configuration */
	schema?: z.ZodSchema<any>;
	/** Default triggers that this action responds to */
	defaultTriggers?: readonly FormActionTrigger[];
	/** Action execution handler function */
	handler: ActionHandler<any>;
}

/**
 * Form Action Configuration Schema
 *
 * Union schema for all registered plugin action schemas.
 * This creates a discriminated union based on the 'type' field.
 */
export const FormActionConfigSchema = z.discriminatedUnion('type', [
	SubmitActionSchema,
	ResetActionSchema,
	NotificationActionSchema,
	AutoSaveActionSchema,
	GTMEventActionSchema,
] as const);
