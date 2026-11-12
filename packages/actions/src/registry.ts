import type { ActionRegistration } from './types';
import { createRegistry, type ReadOnlyRegistry } from '@schema-engine/registry';

/**
 * Registry storage must be able to hold heterogeneous action config shapes.
 * `any` is used here as an existential placeholder for that internal storage boundary.
 */
type AnyActionRegistration<TBaseContext, TTrigger> = ActionRegistration<any, TBaseContext, TTrigger>;

/**
 * Action Registry Provider
 *
 * Interface for objects that can provide action registrations.
 * This allows the ActionDispatcher to look up action handlers without
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
 * Generic, domain-agnostic, read-only registry of action registrations, built
 * from a list on the shared {@link createRegistry} mechanism.
 *
 * @template TContext - Domain-specific context data
 * @template TTrigger - The trigger/event type
 *
 * @remarks
 * A later registration with the same `$type` replaces an earlier one without a
 * warning. Every winning schema must implement Standard Schema; the constructor
 * throws naming the offending `$type`. The registrations are held in a private
 * field, so the registry cannot be changed, and subclasses may add their own fields. To register actions at runtime, implement
 * {@link ActionRegistryProvider} on a `BaseRegistry` subclass instead.
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
 * const registry = new ActionRegistry<MyContext, MyTrigger>([
 *   {
 *     $type: 'log',
 *     schema: logSchema,
 *     metadata: {
 *       name: 'Log Action',
 *       description: 'Logs data',
 *       defaultTriggers: ['change'],
 *     },
 *     execute: async (context) => {
 *       logger.info(context);
 *       return { success: true };
 *     },
 *   },
 * ]);
 *
 * const action = registry.getAction('log');
 * ```
 */
export class ActionRegistry<
	TBaseContext = unknown,
	TTrigger = string,
	TRegistration extends AnyActionRegistration<TBaseContext, TTrigger> = AnyActionRegistration<TBaseContext, TTrigger>,
>
	implements ReadOnlyRegistry<TRegistration>, ActionRegistryProvider<TBaseContext, TTrigger, TRegistration>
{
	readonly #registry: ReadOnlyRegistry<TRegistration>;

	constructor(registrations: readonly TRegistration[]) {
		this.#registry = createRegistry('Action', registrations);
	}

	get kind(): string {
		return this.#registry.kind;
	}

	get size(): number {
		return this.#registry.size;
	}

	get(key: string): TRegistration | undefined {
		return this.#registry.get(key);
	}

	has(key: string): boolean {
		return this.#registry.has(key);
	}

	all(): readonly TRegistration[] {
		return this.#registry.all();
	}

	keys(): readonly string[] {
		return this.#registry.keys();
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
		return [...this.keys()];
	}
}
