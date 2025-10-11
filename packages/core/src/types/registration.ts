import type { z } from 'zod';
import type { ComponentMetadata, ElementMetadata, ActionMetadata } from './metadata';
import type { BuilderActionExecutionContext, BuilderActionExecutionResult } from './actions.js';

/**
 * Element registration object for the new builder pattern.
 *
 * Elements are the building blocks of forms (inputs, content, decorations, interactive).
 * Registration objects can be exported from component libraries and passed to the builder.
 *
 * @template TConfig - The serializable configuration type (from schema)
 * @template TProps - The component props type (TConfig + runtime props like onChange)
 *
 * @example
 * ```typescript
 * export const textInputRegistration: ElementRegistration<
 *   InputFieldConfig,
 *   InputFieldProps
 * > = {
 *   componentId: 'text',
 *   schema: TextInputConfigSchema,
 *   metadata: {
 *     name: 'Text Input',
 *     description: 'Single-line text input field',
 *     category: 'input',
 *     icon: 'text',
 *   },
 *   render: TextInput,
 * };
 * ```
 */
export interface ElementRegistration<TConfig = unknown, TProps = TConfig & { onChange?: (value: unknown) => void }> {
	/** Unique identifier - MUST be unique across all elements */
	componentId: string;
	/** Zod schema for config validation and type inference */
	schema: z.ZodType<TConfig>;
	/** Element metadata with category for filtering/validation */
	metadata: ElementMetadata;
	/** Framework-agnostic render function */
	render: (props: TProps) => unknown;
}

/**
 * Layout registration object.
 *
 * Layouts wrap form content and provide structural organization.
 * Uses base ComponentMetadata (no category needed).
 *
 * @template TConfig - The serializable configuration type (from schema)
 * @template TProps - The component props type (TConfig + children)
 *
 * @example
 * ```typescript
 * export const cardLayoutRegistration: LayoutRegistration<
 *   CardLayoutConfig,
 *   CardLayoutProps
 * > = {
 *   layoutId: 'card',
 *   schema: CardLayoutConfigSchema,
 *   metadata: {
 *     name: 'Card Layout',
 *     description: 'Display form in a centered card',
 *     icon: 'card',
 *   },
 *   render: CardLayout,
 * };
 * ```
 */
export interface LayoutRegistration<TConfig = unknown, TProps = any> {
	/** Unique identifier - MUST be unique across all layouts */
	layoutId: string;
	/** Zod schema for config validation and type inference */
	schema: z.ZodType<TConfig>;
	/** Component metadata (no category for layouts) */
	metadata: ComponentMetadata;
	/** Framework-agnostic render function */
	render: (props: TProps) => unknown;
}

/**
 * Stepper registration object.
 *
 * Steppers control multi-step form navigation and state.
 * Uses base ComponentMetadata (no category needed).
 *
 * @template TConfig - The serializable configuration type (from schema)
 * @template TProps - The component props type (defaults to TConfig)
 *
 * @example
 * ```typescript
 * export const wizardStepperRegistration: StepperRegistration<
 *   WizardStepperConfig,
 *   WizardStepperProps
 * > = {
 *   stepperId: 'wizard',
 *   schema: WizardStepperConfigSchema,
 *   metadata: {
 *     name: 'Wizard Stepper',
 *     description: 'Step-by-step wizard navigation',
 *     icon: 'wizard',
 *   },
 *   render: WizardStepper,
 * };
 * ```
 */
export interface StepperRegistration<TConfig = unknown, TProps = any> {
	/** Unique identifier - MUST be unique across all steppers */
	stepperId: string;
	/** Zod schema for config validation and type inference */
	schema: z.ZodType<TConfig>;
	/** Component metadata (no category for steppers) */
	metadata: ComponentMetadata;
	/** Framework-agnostic render function */
	render: (props: TProps) => unknown;
}

/**
 * Action registration object for the new builder pattern.
 *
 * Actions are event handlers that execute in response to form events.
 * They are separate from components and have their own execution context.
 *
 * @example
 * ```typescript
 * export const submitActionRegistration: BuilderActionRegistration<z.infer<typeof SubmitActionConfigSchema>> = {
 *   actionType: 'submit',
 *   schema: SubmitActionConfigSchema,
 *   metadata: {
 *     name: 'Submit Form',
 *     description: 'Submit form data to an endpoint',
 *     icon: 'send',
 *   },
 *   execute: async (context) => {
 *     // Implementation
 *     return { success: true };
 *   },
 * };
 * ```
 */
export interface BuilderActionRegistration<TConfig = unknown> {
	/** Unique action type identifier - MUST be unique across all actions */
	actionType: string;
	/** Zod schema for config validation and type inference */
	schema: z.ZodType<TConfig>;
	/** Action metadata (separate from component metadata) */
	metadata: ActionMetadata;
	/** Action execution handler */
	execute: (context: BuilderActionExecutionContext<TConfig>) => Promise<BuilderActionExecutionResult>;
}

// Backward compatibility aliases
export type ActionRegistration<TConfig = unknown> = BuilderActionRegistration<TConfig>;
