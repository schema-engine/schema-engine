/**
 * @schema-engine/actions
 *
 * Domain-agnostic action system for event-driven architectures: register handlers,
 * execute them sequentially, and dispatch by trigger from any host (forms, workflows, UI).
 *
 * @example
 * ```typescript
 * import * as z from 'zod/mini';
 * import { ActionDispatcher, ActionExecutor, ActionRegistry } from '@schema-engine/actions';
 *
 * const registry = new ActionRegistry<{ formId: string }, 'submit' | 'change'>();
 * registry.register({
 *   $type: 'log',
 *   schema: z.object({ id: z.string(), $type: z.literal('log'), message: z.string() }),
 *   metadata: { name: 'Log', defaultTriggers: ['change'] },
 *   execute: async (ctx) => {
 *     console.log(ctx.config.message, ctx);
 *     return { success: true };
 *   },
 * });
 *
 * const dispatcher = new ActionDispatcher(registry);
 * await dispatcher.dispatch({
 *   actions: [{ id: '1', $type: 'log', message: 'hello' }],
 *   trigger: 'submit',
 *   context: { formId: 'demo' },
 * });
 * ```
 */

export * from './types';
export * from './registry';
export * from './executor';
export * from './dispatcher';
