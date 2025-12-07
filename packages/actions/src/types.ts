import type { z } from 'zod';

/**
 * Action Execution Context
 *
 * Generic context passed to action handlers during execution.
 * The context contains all necessary information about the current state,
 * event trigger, and any domain-specific data.
 *
 * @template TContext - Domain-specific context data (e.g., form state, UI state, workflow state)
 * @template TTrigger - The trigger/event type that caused this action to execute
 *
 * @example Form Domain
 * ```typescript
 * type FormContext = {
 *   formId: string;
 *   formData: Record<string, unknown>;
 *   isValid: boolean;
 *   controller: FormController;
 * };
 *
 * type FormTrigger = 'submit' | 'change' | 'mount';
 *
 * type FormActionContext = ActionExecutionContext<FormContext, FormTrigger>;
 * ```
 *
 * @example Workflow Domain
 * ```typescript
 * type WorkflowContext = {
 *   workflowId: string;
 *   currentState: string;
 *   data: Record<string, unknown>;
 * };
 *
 * type WorkflowTrigger = 'transition' | 'complete' | 'error';
 *
 * type WorkflowActionContext = ActionExecutionContext<WorkflowContext, WorkflowTrigger>;
 * ```
 */
export interface ActionExecutionContext<TContext = unknown, TTrigger = string> {
	/** The trigger/event that caused this action to execute */
	trigger: TTrigger;
	/** Domain-specific context data */
	context: TContext;
}

/**
 * Action Execution Result
 *
 * Standardized return type for all action handlers.
 * Provides success status, messages, data, and flow control information.
 *
 * @template TData - Type of data returned by the action
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
 *   shouldContinue: false,
 * };
 * ```
 */
export interface ActionExecutionResult<TData = unknown> {
	/** Whether the action executed successfully */
	success: boolean;
	/** Success message to display or log */
	message?: string;
	/** Error message if action failed */
	error?: string;
	/** Data returned by the action (e.g., API response) */
	data?: TData;
	/** Whether to continue executing subsequent actions */
	shouldContinue?: boolean;
	/** URL to redirect to after action completion */
	redirectUrl?: string;
}

/**
 * Action Handler Function Type
 *
 * Function signature for action handlers that execute specific action types.
 *
 * @template TConfig - The action configuration type
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 * @template TData - The type of data returned by the action
 */
export type ActionHandler<TConfig = unknown, TContext = unknown, TTrigger = string, TData = unknown> = (
	executionContext: ActionExecutionContext<TContext, TTrigger>,
	config: TConfig,
) => Promise<ActionExecutionResult<TData>> | ActionExecutionResult<TData>;

/**
 * Action Metadata
 *
 * Descriptive information about an action type.
 *
 * @template TTrigger - The trigger/event type
 */
export interface ActionMetadata<TTrigger = string> {
	/** Human-readable name */
	name: string;
	/** Description of what the action does */
	description?: string;
	/** Icon identifier (optional) */
	icon?: string;
	/** Default triggers that this action responds to */
	defaultTriggers?: readonly TTrigger[];
	/** Category for grouping actions (optional) */
	category?: string;
}

/**
 * Action Registration
 *
 * Configuration object for registering actions in an action registry.
 * Used to define action behavior, validation, and metadata.
 *
 * @template TType - The action type identifier
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 *
 * @example
 * ```typescript
 * const logAction: ActionRegistration<'log', AppContext, AppTrigger> = {
 *   $type: 'log',
 *   schema: z.object({
 *     id: z.string(),
 *     $type: z.literal('log'),
 *     level: z.enum(['info', 'warn', 'error']),
 *     message: z.string(),
 *   }),
 *   metadata: {
 *     name: 'Log Message',
 *     description: 'Logs a message to the console',
 *     defaultTriggers: ['change', 'submit'],
 *   },
 *   handler: async (context, config) => {
 *     console[config.level](config.message);
 *     return { success: true };
 *   },
 * };
 * ```
 */
export interface ActionRegistration<TType extends string = string, TContext = unknown, TTrigger = string> {
	/** Unique action type identifier */
	$type: TType;
	/** Zod schema for validating action configuration (validates TConfig type) */
	schema: z.ZodTypeAny;
	/** Action metadata (name, description, default triggers, etc.) */
	metadata: ActionMetadata<TTrigger>;
	/**
	 * Action execution function - accepts the domain-specific context directly.
	 * Note: TContext typically includes the validated action configuration within it (e.g., as a 'config' property).
	 */
	execute: (context: TContext) => Promise<ActionExecutionResult> | ActionExecutionResult;
}

/**
 * Action Configuration Base
 *
 * Base interface for action configurations.
 * All action configs must have an id, type, and enabled flag.
 *
 * @template TType - The action type identifier
 */
export interface ActionConfigBase<TType extends string = string> {
	/** Unique identifier for this action instance */
	id: string;
	/** Action type - references a registered action */
	$type: TType;
	/** Whether this action is enabled */
	enabled?: boolean;
	/** Custom triggers for this specific action instance */
	triggers?: readonly string[];
}
