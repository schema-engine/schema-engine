// oxlint-disable no-redundant-type-constituents
import type { z } from 'zod';
import type { ComponentMetadata, ElementMetadata } from './metadata';
import type { BuilderActionExecutionContext, BuilderActionTrigger } from './actions.js';
import type { ActionRegistration } from '@schema-engine/actions';

declare global {
	namespace FormEngine {
		interface ElementRegistry {}
		interface LayoutRegistry {}
		interface StepperRegistry {}
	}
}

/** Brand symbol for compile-time type discrimination (erased at runtime) */
declare const __brand: unique symbol;
/**
 * Phantom type brand - adds compile-time type identity without runtime cost.
 * Brand properties are optional and never exist at runtime, used only by TypeScript
 * to provide semantic discrimination between structurally identical types.
 */
type Brand<T, TBrand> = T & { readonly [__brand]?: TBrand };

/**
 * Base registration interface - common fields for all registration types.
 *
 * All registration objects (elements, layouts, steppers, actions) extend this base.
 *
 * @template TConfig - The serializable configuration type (from schema)
 * @template TMeta - The metadata type (ComponentMetadata, ElementMetadata, or ActionMetadata)
 */
export interface BaseRegistration<TConfig = unknown, TMeta extends ComponentMetadata = ComponentMetadata> {
	/** Unique identifier - MUST be unique within its registry type. Uses $type to avoid conflicts with common 'id' properties. */
	$type: string;
	/** Zod schema for config validation and type inference */
	schema: z.ZodType<TConfig>;
	/** Component or action metadata */
	metadata: TMeta;
}

/**
 * Component registration interface.
 *
 * Foundation for all component registrations (elements, layouts, steppers).
 * Components are the building blocks of forms and layouts.
 *
 * Use branded type aliases (`InputRegistration`, `LayoutRegistration`, etc.) for
 * semantic clarity and compile-time type safety.
 *
 * @template TType - The component type identifier (must match a registry key)
 * @template TConfig - The serializable configuration type (from schema)
 * @template TProps - The component props type (passed to render function)
 * @template TMeta - The metadata type (ElementMetadata, ComponentMetadata, etc.)
 */
export interface ComponentRegistration<
	TType extends string = string,
	TConfig = unknown,
	TProps = unknown,
	TMeta extends ComponentMetadata = ComponentMetadata,
> extends BaseRegistration<TConfig, TMeta> {
	/** Framework-agnostic render function */
	render: (props: TProps) => unknown;
	/** Type identifier - enforced to match registry key */
	$type: TType;
}

/**
 * Branded type aliases for semantic component registration.
 *
 * Provides type-safe patterns for registering components across different frameworks:
 * - `InputRegistration<>` - Form inputs (explicit props with framework-specific handlers)
 * - `StaticRegistration<>` - Static display elements without handlers
 * - `LayoutRegistration<>` - Layout containers with explicit children typing
 * - `StepperRegistration<>` - Multi-step navigation components with explicit children
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
 * Layout component registration - containers that structure form content.
 *
 * Must provide explicit TProps including framework-specific children typing for type safety.
 *
 * @template TType - Layout type identifier
 * @template TConfig - Serializable configuration type
 * @template TProps - Explicit props type with children property
 *
 * @example
 * ```typescript
 * export const CardLayoutRegistration: LayoutRegistration<
 *   'card',
 *   CardLayoutConfig,
 *   CardLayoutConfig & { children?: React.ReactNode }
 * > = { ... };
 * ```
 */
export type LayoutRegistration<
	TType extends keyof FormEngine.LayoutRegistry | string = keyof FormEngine.LayoutRegistry | string,
	TConfig = unknown,
	TProps = unknown,
> = Brand<ComponentRegistration<TType, TConfig, TProps>, 'Layout'>;

/**
 * Stepper component registration - multi-step navigation components.
 *
 * Must provide explicit TProps including framework-specific children typing for type safety.
 *
 * @template TType - Stepper type identifier
 * @template TConfig - Serializable configuration type
 * @template TProps - Explicit props type with children property
 *
 * @example
 * ```typescript
 * export const DefaultStepperRegistration: StepperRegistration<
 *   'default',
 *   DefaultStepperConfig,
 *   DefaultStepperConfig & { children?: React.ReactNode }
 * > = { ... };
 * ```
 */
export type StepperRegistration<
	TType extends keyof FormEngine.StepperRegistry | string = keyof FormEngine.StepperRegistry | string,
	TConfig = unknown,
	TProps = unknown,
> = Brand<ComponentRegistration<TType, TConfig, TProps>, 'Stepper'>;

/**
 * Action registration object for forms.
 *
 * This extends the base ActionRegistration from @schema-engine/actions,
 * specialized with form-specific context (BuilderActionExecutionContext) and trigger types.
 *
 * @template TType - The action type identifier
 * @template TConfig - The action configuration type
 *
 * @example
 * ```typescript
 * export const submitAction: BuilderActionRegistration<'submit', SubmitConfig> = {
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
 * };
 * ```
 */
export type BuilderActionRegistration<TType extends string = string, TConfig = unknown> = ActionRegistration<
	TType,
	BuilderActionExecutionContext<TConfig>,
	BuilderActionTrigger
>;
