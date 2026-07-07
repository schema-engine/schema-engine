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
 * import { z } from 'zod';
 * import { ActionExecutor, ActionRegistration, ActionRegistry } from '@schema-engine/actions';
 *
 * // Define your domain-specific types
 * type MyTrigger = 'submit' | 'change' | 'mount';
 * type MyContext = { formId: string; data: Record<string, unknown> };
 * interface LogActionConfig {
 *   id: string;
 *   $type: 'log';
 *   message: string;
 * }
 *
 * // Create action registrations
 * const logAction: ActionRegistration<LogActionConfig, MyContext, MyTrigger> = {
 *   $type: 'log',
 *   schema: z.object({
 *     id: z.string(),
 *     $type: z.literal('log'),
 *     message: z.string(),
 *   }),
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
 * const registry = new ActionRegistry<MyContext, MyTrigger>();
 * registry.register(logAction);
 * const executor = new ActionExecutor(registry);
 * const results = await executor.execute({
 *   actions: [{ id: 'log-1', $type: 'log', message: 'hello' }],
 *   trigger: 'submit',
 *   context: { formId: '123', data: {} },
 * });
 * ```
 */

export * from './types';
export * from './registry';
export * from './executor';
export * from './dispatcher';
