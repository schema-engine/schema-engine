import type { BaseRegistration, RegistrationMetadata } from '@schema-engine/registry';

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

/**
 * Action Runtime Context
 *
 * Context received by action handlers at execution time.
 * The executor creates this runtime shape by enriching the caller-provided
 * base context with the current action config and trigger.
 *
 * @template TConfig - Action configuration type
 * @template TBaseContext - Caller-provided base context
 * @template TTrigger - Trigger/event type
 */
export type ActionRuntimeContext<TConfig = unknown, TBaseContext = unknown, TTrigger = string> = TBaseContext & {
	/** Current action configuration */
	config: TConfig;
	/** Trigger/event that caused this action to execute */
	trigger: TTrigger;
	/** Action config that triggered nested execution, when applicable */
	triggeredBy?: TConfig;
};

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
 * Function signature for action handlers using the current runtime-enrichment model.
 * At execution time, the domain context is enriched with the current action config
 * and trigger before the handler is called.
 *
 * @template TConfig - The action configuration type
 * @template TContext - Domain-specific base context data
 * @template TTrigger - The trigger/event type
 * @template TData - The type of data returned by the action
 */
export type ActionHandler<TConfig = unknown, TContext = unknown, TTrigger = string, TData = unknown> = (
	context: ActionRuntimeContext<TConfig, TContext, TTrigger>,
) => Promise<ActionExecutionResult<TData>> | ActionExecutionResult<TData>;

/**
 * Action Metadata
 *
 * Descriptive information about an action type.
 *
 * @template TTrigger - The trigger/event type
 */
export interface ActionMetadata<TTrigger = string> extends RegistrationMetadata {
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
 * @template TConfig - Action configuration type
 * @template TBaseContext - Caller-provided base context data
 * @template TTrigger - The trigger/event type
 *
 * @example
 * ```typescript
 * const logAction: ActionRegistration<LogActionConfig, AppContext, AppTrigger> = {
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
 *   execute: async (context) => {
 *     console[context.config.level](context.config.message);
 *     return { success: true };
 *   },
 * };
 * ```
 */
export interface ActionRegistration<
	TConfig extends ActionConfigBase = ActionConfigBase,
	TBaseContext = unknown,
	TTrigger = string,
	TData = unknown,
> extends BaseRegistration<TConfig, ActionMetadata<TTrigger>> {
	/** Unique action type identifier */
	$type: TConfig['$type'];
	/**
	 * Action execution function.
	 * Receives the runtime context produced by the executor.
	 */
	execute: ActionHandler<TConfig, TBaseContext, TTrigger, TData>;
}

/**
 * Action executor input.
 */
export interface ActionExecuteInput<
	TConfig extends ActionConfigBase = ActionConfigBase,
	TBaseContext = unknown,
	TTrigger = string,
> {
	/** Trigger/event causing execution */
	trigger: TTrigger;
	/** Action configurations to evaluate */
	actions: readonly TConfig[];
	/** Caller-provided base context */
	context: TBaseContext;
	/** Optional reference to the action that triggered nested execution */
	triggeredBy?: TConfig;
}

/**
 * Action dispatcher input.
 */
export interface ActionDispatchInput<
	TConfig extends ActionConfigBase = ActionConfigBase,
	TBaseContext = unknown,
	TTrigger = string,
> extends ActionExecuteInput<TConfig, TBaseContext, TTrigger> {
	/** Additional metadata to merge into context.metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Create a strongly typed action-definition helper for one domain.
 */
export function defineAction<TBaseContext, TTrigger = string>() {
	return function <TConfig extends ActionConfigBase, TData = unknown>(
		registration: ActionRegistration<TConfig, TBaseContext, TTrigger, TData>,
	): ActionRegistration<TConfig, TBaseContext, TTrigger, TData> {
		return registration;
	};
}
