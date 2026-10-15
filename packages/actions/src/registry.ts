import type { ActionRegistration } from './types';
import { BaseRegistry } from '@schema-engine/registry';

/**
 * Registry storage must be able to hold heterogeneous action config shapes.
 * `any` is used here as an existential placeholder for that internal storage boundary.
 */
type AnyActionRegistration<TBaseContext, TTrigger> = ActionRegistration<any, TBaseContext, TTrigger>;

/**
 * Action Registry Provider
 *
 * Interface for objects that can provide action registrations.
 * This allows the ActionExecutor to look up action handlers without
 * depending on a specific registry implementation.
 *
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 * @template TRegistration - The registration type (defaults to ActionRegistration)
 *
 * @example
 * ```typescript
 * class MyActionRegistry implements ActionRegistryProvider<MyContext, MyTrigger> {
 *   private actions = new Map<string, ActionRegistration<any, MyContext, MyTrigger>>();
 *
 *   register(action: ActionRegistration<any, MyContext, MyTrigger>): void {
 *     this.actions.set(action.$type, action);
 *   }
 *
 *   getAction(type: string): ActionRegistration<any, MyContext, MyTrigger> | undefined {
 *     return this.actions.get(type);
 *   }
 *
 *   getActionTypes(): string[] {
 *     return Array.from(this.actions.keys());
 *   }
 * }
 * ```
 */
export interface ActionRegistryProvider<
	TBaseContext = unknown,
	TTrigger = string,
	TRegistration extends AnyActionRegistration<TBaseContext, TTrigger> = AnyActionRegistration<TBaseContext, TTrigger>,
> {
	/**
	 * Get an action registration by type
	 *
	 * @param type - The action type identifier
	 * @returns The action registration or undefined if not found
	 */
	getAction(type: string): TRegistration | undefined;

	/**
	 * Get all registered action types
	 *
	 * @returns Array of action type identifiers
	 */
	getActionTypes(): string[];
}

/**
 * Action Registry
 *
 * Generic, domain-agnostic registry for managing action registrations.
 * Provides storage, retrieval, and lookup capabilities for actions.
 *
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 *
 * @example
 * ```typescript
 * import { ActionRegistry } from '@schema-engine/actions';
 *
 * type MyTrigger = 'submit' | 'change';
 * import { Logger } from '@ecopages/logger';
 * type MyContext = { formId: string; data: Record<string, unknown> };
 *
 * const logger = new Logger('[my-app]');
 * const registry = new ActionRegistry<MyContext, MyTrigger>();
 *
 * registry.register({
 *   $type: 'log',
 *   metadata: {
 *     name: 'Log Action',
 *     description: 'Logs data',
 *     defaultTriggers: ['change'],
 *   },
 *   execute: async (context) => {
 *     logger.info(context);
 *     return { success: true };
 *   },
 * });
 *
 * const action = registry.getAction('log');
 * ```
 */
export class ActionRegistry<
	TBaseContext = unknown,
	TTrigger = string,
	TRegistration extends AnyActionRegistration<TBaseContext, TTrigger> = AnyActionRegistration<TBaseContext, TTrigger>,
>
	extends BaseRegistry<string, TRegistration>
	implements ActionRegistryProvider<TBaseContext, TTrigger, TRegistration>
{
	get registryName(): string {
		return 'ActionRegistry';
	}

	/**
	 * Get an action registration by type
	 */
	getAction(type: string): TRegistration | undefined {
		return this.get(type);
	}

	/**
	 * Get all registered action types
	 */
	getActionTypes(): string[] {
		return this.getAllKeys();
	}
}
