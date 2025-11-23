import type { ActionRegistration } from './types';

/**
 * Action Registry Provider
 *
 * Interface for objects that can provide action registrations.
 * This allows the ActionExecutor to look up action handlers without
 * depending on a specific registry implementation.
 *
 * @template TConfig - The action configuration type
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 * @template TRegistration - The registration type (defaults to ActionRegistration)
 *
 * @example
 * ```typescript
 * class MyActionRegistry implements ActionRegistryProvider<MyConfig, MyContext, MyTrigger> {
 *   private actions = new Map<string, ActionRegistration<string, MyConfig, MyContext, MyTrigger>>();
 *
 *   register(action: ActionRegistration<string, MyConfig, MyContext, MyTrigger>): void {
 *     this.actions.set(action.$type, action);
 *   }
 *
 *   getAction(type: string): ActionRegistration<string, MyConfig, MyContext, MyTrigger> | undefined {
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
	TConfig = unknown,
	TContext = unknown,
	TTrigger = string,
	TRegistration extends ActionRegistration<string, TConfig, TContext, TTrigger> = ActionRegistration<
		string,
		TConfig,
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
 * @template TConfig - The action configuration type
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 *
 * @example
 * ```typescript
 * import { ActionRegistry } from '@schema-engine/actions';
 *
 * type MyTrigger = 'submit' | 'change';
 * type MyContext = { formId: string; data: Record<string, unknown> };
 * type MyConfig = { id: string; $type: string };
 *
 * const registry = new ActionRegistry<MyConfig, MyContext, MyTrigger>();
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
export class ActionRegistry<TConfig = unknown, TContext = unknown, TTrigger = string>
	implements ActionRegistryProvider<TConfig, TContext, TTrigger>
{
	private actions = new Map<string, ActionRegistration<string, TConfig, TContext, TTrigger>>();

	/**
	 * Register an action
	 *
	 * @param action - The action registration to register
	 */
	register(action: ActionRegistration<string, TConfig, TContext, TTrigger>): void {
		this.actions.set(action.$type, action);
	}

	/**
	 * Check if an action type is registered
	 *
	 * @param type - The action type to check
	 * @returns True if the action type is registered
	 */
	has(type: string): boolean {
		return this.actions.has(type);
	}

	/**
	 * Get an action registration by type
	 *
	 * @param type - The action type identifier
	 * @returns The action registration or undefined if not found
	 */
	getAction(type: string): ActionRegistration<string, TConfig, TContext, TTrigger> | undefined {
		return this.actions.get(type);
	}

	/**
	 * Get all registered action types
	 *
	 * @returns Array of action type identifiers
	 */
	getActionTypes(): string[] {
		return Array.from(this.actions.keys());
	}

	/**
	 * Get all registered actions
	 *
	 * @returns Array of all action registrations
	 */
	getAll(): ActionRegistration<string, TConfig, TContext, TTrigger>[] {
		return Array.from(this.actions.values());
	}

	/**
	 * Get default triggers for an action type
	 *
	 * @param type - Action type to get triggers for
	 * @returns Array of default triggers or undefined if not found
	 */
	getDefaultTriggers(type: string): readonly TTrigger[] | undefined {
		return this.getAction(type)?.metadata?.defaultTriggers;
	}

	/**
	 * Get the number of registered actions
	 *
	 * @returns The number of registered actions
	 */
	get size(): number {
		return this.actions.size;
	}

	/**
	 * Get the underlying actions map
	 *
	 * @returns The actions map
	 */
	getMap(): Map<string, ActionRegistration<string, TConfig, TContext, TTrigger>> {
		return this.actions;
	}

	/**
	 * Clear all registered actions
	 */
	clear(): void {
		this.actions.clear();
	}
}
