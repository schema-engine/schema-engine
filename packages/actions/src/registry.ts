import type { ActionRegistration } from './types';
import { BaseRegistry } from '@schema-engine/registry';

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
 *   private actions = new Map<string, ActionRegistration<string, MyContext, MyTrigger>>();
 *
 *   register(action: ActionRegistration<string, MyContext, MyTrigger>): void {
 *     this.actions.set(action.$type, action);
 *   }
 *
 *   getAction(type: string): ActionRegistration<string, MyContext, MyTrigger> | undefined {
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
	TContext = unknown,
	TTrigger = string,
	TRegistration extends ActionRegistration<string, TContext, TTrigger> = ActionRegistration<
		string,
		TContext,
		TTrigger
	>,
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
 * type MyContext = { formId: string; data: Record<string, unknown> };
 *
 * const registry = new ActionRegistry<MyContext, MyTrigger>();
 *
 * registry.register({
 *   $type: 'log',
 *   metadata: {
 *     name: 'Log Action',
 *     description: 'Logs data',
 *     defaultTriggers: ['change'],
 *   },
 *   handler: async (context, config) => {
 *     console.log(context);
 *     return { success: true };
 *   },
 * });
 *
 * const action = registry.getAction('log');
 * ```
 */
/**
 * Action Registry
 *
 * Generic, domain-agnostic registry for managing action registrations.
 * Provides storage, retrieval, and lookup capabilities for actions.
 */
export class ActionRegistry<TContext = unknown, TTrigger = string>
	extends BaseRegistry<string, ActionRegistration<string, TContext, TTrigger>>
	implements ActionRegistryProvider<TContext, TTrigger>
{
	get registryName(): string {
		return 'ActionRegistry';
	}

	/**
	 * Get an action registration by type
	 */
	getAction(type: string): ActionRegistration<string, TContext, TTrigger> | undefined {
		return this.get(type);
	}

	/**
	 * Get all registered action types
	 */
	getActionTypes(): string[] {
		return this.getAllKeys();
	}
}
