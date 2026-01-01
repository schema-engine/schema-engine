import { z } from 'zod';
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
