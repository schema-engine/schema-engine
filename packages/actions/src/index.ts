/**
 * @schema-engine/actions
 *
 * Domain-agnostic action system for event-driven architectures.
 *
 * This package provides a generic, extensible action execution framework that can be used
 * in any domain (forms, workflows, state machines, UI interactions, etc.).
 *
 * Key Features:
 * - Fully generic and type-safe
 * - No dependencies on specific domains or frameworks
 * - Sequential action execution with lifecycle management
 * - Pluggable action registry
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * import { ActionExecutor, ActionRegistration, ActionRegistryProvider } from '@schema-engine/actions';
 *
 * // Define your domain-specific types
 * type MyTrigger = 'submit' | 'change' | 'mount';
 * type MyContext = { formId: string; data: Record<string, unknown> };
 *
 * // Create action registrations
 * const logAction: ActionRegistration<'log', MyContext, MyTrigger> = {
 *   $type: 'log',
 *   metadata: {
 *     name: 'Log Action',
 *     description: 'Logs data',
 *     defaultTriggers: ['change'],
 *   },
 *   execute: async (context) => {
 *     console.log(context);
 *     return { success: true };
 *   },
 * };
 *
 * // Create and use executor
 * const executor = new ActionExecutor(registry);
 * const results = await executor.execute(actions, 'submit', context);
 * ```
 */

export type {
	ActionExecutionContext,
	ActionExecutionResult,
	ActionHandler,
	ActionMetadata,
	ActionRegistration,
	ActionConfigBase,
} from './types';
export type { ActionRegistryProvider } from './registry';
export { ActionRegistry } from './registry';
export { ActionExecutor } from './executor';
export type { ActionExecutorOptions } from './executor';
export { ActionDispatcher } from './dispatcher';
export type { ActionDispatcherOptions } from './dispatcher';
