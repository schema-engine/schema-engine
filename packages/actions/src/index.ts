/**
 * @schema-engine/actions
 *
 * Domain-agnostic action system for event-driven architectures: register handlers,
 * execute them sequentially, and dispatch by trigger from any host (forms, workflows, UI).
 *
 * @example
 * ```typescript
 * import * as z from 'zod/mini';
 * import { Logger } from '@ecopages/logger';
 * import { ActionDispatcher, ActionRegistry } from '@schema-engine/actions';
 *
 * const logger = new Logger('[my-app]');
 * const registry = new ActionRegistry<{ formId: string }, 'submit' | 'change'>();
 * registry.register({
 *   $type: 'log',
 *   schema: z.object({ id: z.string(), $type: z.literal('log'), message: z.string() }),
 *   metadata: { name: 'Log', defaultTriggers: ['change'] },
 *   execute: async (ctx) => {
 *     logger.info(ctx.config.message, ctx);
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
export * from './dispatcher';
