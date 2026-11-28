/**
 * @schema-engine/actions
 *
 * Domain-agnostic action system for event-driven architectures: register handlers,
 * execute them in sequence or parallel groups, and dispatch by trigger from any host (forms, workflows, UI).
 *
 * @example
 * ```typescript
 * import * as z from 'zod/mini';
 * import { Logger } from '@ecopages/logger';
 * import { createRegistry } from '@schema-engine/registry';
 * import { ActionDispatcher, defineAction, parseActions } from '@schema-engine/actions';
 *
 * const logger = new Logger('[my-app]');
 * const defineLogAction = defineAction<{ formId: string }, 'submit' | 'change'>();
 * const log = defineLogAction({
 *   $type: 'log',
 *   schema: z.object({ message: z.string() }),
 *   metadata: { name: 'Log', defaultTriggers: ['change'] },
 *   execute: async (ctx) => {
 *     logger.info(ctx.config.message, ctx);
 *     return { success: true };
 *   },
 * });
 * const registry = createRegistry('Action', [log]);
 *
 * const dispatcher = new ActionDispatcher(registry);
 * const parsed = parseActions(registry, [{ id: '1', $type: 'log', message: 'hello' }]);
 * if (parsed.success) {
 *   await dispatcher.dispatch({ actions: parsed.data, trigger: 'change', context: { formId: 'demo' } });
 * }
 * ```
 */

export * from './types';
export * from './dispatcher';
export * from './parse-actions';
