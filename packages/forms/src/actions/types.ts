import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
import { FormSubmitActionSchema } from './plugins/form-submit.plugin';
import { FormResetActionSchema } from './plugins/form-reset.plugin';
import { NotificationActionSchema } from './plugins/notification.plugin';
import { AutoSaveActionSchema } from './plugins/auto-save.plugin';
import { GTMEventActionSchema } from './plugins/gtm.plugin';

/**
 * Global Action Registry
 *
 * Extension point for registering custom action types via global namespace augmentation.
 * External packages can extend this interface to add their action schemas.
 *
 * @example
 * ```typescript
 * declare global {
 *   namespace FormEngine {
 *     interface ActionRegistry {
 *       my_custom_action: MyCustomActionConfig;
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
 * TypeScript can automatically infer the correct action type based on the '$type' field.
 */
export type FormActionConfig = FormEngine.ActionRegistry[keyof FormEngine.ActionRegistry];

/**
 * Form-specific context for action execution
 *
 * This is the domain-specific context passed to form action handlers.
 * It contains all form state, validation info, and React Hook Form controller.
 */
export interface FormActionContext {
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
 * Form Action Configuration Schema
 *
 * Union schema for all built-in form action plugins.
 * This creates a discriminated union based on the '$type' field.
 */
export const FormActionConfigSchema = z.discriminatedUnion('$type', [
	FormSubmitActionSchema,
	FormResetActionSchema,
	NotificationActionSchema,
	AutoSaveActionSchema,
	GTMEventActionSchema,
] as const);
