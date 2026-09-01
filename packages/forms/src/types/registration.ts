// oxlint-disable no-redundant-type-constituents
import type { ComponentRegistration, Brand } from '@schema-engine/registry';
import type { ElementMetadata } from './metadata';
import type { BuilderActionBaseContext, BuilderActionTrigger } from './actions.js';
import type { ActionRegistration, ActionConfigBase } from '@schema-engine/actions';

declare global {
	namespace FormEngine {
		interface ElementRegistry {}
		interface RecipeRegistry {}
	}
}

/**
 * Branded type aliases for semantic component registration.
 *
 * Provides type-safe patterns for registering components across different frameworks:
 * - `InputRegistration<>` - Form inputs (explicit props with framework-specific handlers)
 * - `StaticRegistration<>` - Static display elements without handlers
 *
 * All require explicit TProps as the third type parameter to specify framework-specific
 * event handlers and props. This avoids framework assumptions (React onChange vs Vue onUpdate:modelValue).
 *
 * Branded types are structurally identical at runtime but provide compile-time type safety
 * and semantic clarity about component purpose.
 */

/**
 * Input element registration - form inputs, selects, checkboxes, and interactive elements.
 *
 * Must provide explicit TProps specifying framework-specific handlers and properties.
 * This prevents implicit assumptions about event naming across different frameworks.
 *
 * @template TType - Element type identifier
 * @template TConfig - Serializable configuration type
 * @template TProps - Explicit framework-specific props type (e.g., with onChange, onBlur for React)
 *
 * @example
 * ```typescript
 * export const NumberInputRegistration: InputRegistration<
 *   'number',
 *   NumberFieldConfig,
 *   NumberFieldConfig & { onChange?: (value: unknown) => void; onBlur?: () => void }
 * > = { ... };
 * ```
 */
export type InputRegistration<
	TType extends keyof FormEngine.ElementRegistry | string = keyof FormEngine.ElementRegistry | string,
	TConfig = unknown,
	TProps = TConfig,
> = Brand<ComponentRegistration<TType, TConfig, TProps, ElementMetadata>, 'Input'>;

/**
 * Static element registration - display-only elements without event handlers.
 * Use for headings, text, images, dividers, and other non-interactive elements.
 *
 * @template TType - Element type identifier
 * @template TConfig - Serializable configuration type
 * @template TProps - Explicit framework-specific props type (defaults to TConfig)
 */
export type StaticRegistration<
	TType extends keyof FormEngine.ElementRegistry | string = keyof FormEngine.ElementRegistry | string,
	TConfig = unknown,
	TProps = TConfig,
> = Brand<ComponentRegistration<TType, TConfig, TProps, ElementMetadata>, 'Static'>;

/**
 * View recipe registration — code-defined wiring of shell and slot blocks.
 *
 * @template TType - Recipe type identifier
 * @template TConfig - Serializable view configuration type
 */
export type RecipeRegistration<
	TType extends keyof FormEngine.RecipeRegistry | string = keyof FormEngine.RecipeRegistry | string,
	TConfig = unknown,
	TRender = unknown,
> = Brand<
	{
		$type: TType;
		kind: import('@/recipes/types').RecipeKind;
		slots: import('@/recipes/types').RecipeSlot[];
		schema: ComponentRegistration<TType, TConfig>['schema'];
		metadata: import('@/recipes/types').RecipeMetadata;
		slotDefaults?: Partial<Record<import('@/recipes/types').RecipeSlot, Record<string, unknown>>>;
		/** Adapter render payload (shell + slot components). */
		render: TRender;
	},
	'Recipe'
>;

/**
 * Action registration object for forms.
 *
 * This extends the base ActionRegistration from @schema-engine/actions,
 * specialized with form-specific base context and trigger types.
 * Action handlers still receive BuilderActionExecutionContext<TConfig> at runtime.
 *
 * @template TType - The action type identifier
 * @template TConfig - The action configuration type
 *
 * @example
 * ```typescript
 * import { defineAction } from '@schema-engine/actions';
 * import type { BuilderActionBaseContext, BuilderActionTrigger } from '@schema-engine/forms';
 *
 * const defineFormAction = defineAction<BuilderActionBaseContext, BuilderActionTrigger>();
 *
 * export const submitAction: BuilderActionRegistration<'submit', SubmitConfig> = defineFormAction({
 *   $type: 'submit',
 *   schema: SubmitActionConfigSchema,
 *   metadata: {
 *     name: 'Submit Form',
 *     description: 'Submit form data to an endpoint',
 *     defaultTriggers: ['form_submit'],
 *   },
 *   execute: async (executionContext) => {
 *     // executionContext is BuilderActionExecutionContext<SubmitConfig>
 *     // which includes formId, formData, isValid, config, etc.
 *     return { success: true };
 *   },
 * });
 * ```
 */
export type BuilderActionRegistration<
	TType extends string = string,
	TConfig extends ActionConfigBase<TType> = ActionConfigBase<TType>,
> = ActionRegistration<TConfig, BuilderActionBaseContext, BuilderActionTrigger>;
