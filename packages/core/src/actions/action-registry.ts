import type { ActionTrigger } from './triggers';
import type { ActionExecutionContext, ActionExecutionResult, RegisteredAction } from './types';
import { Logger } from '@ecopages/logger';

const logger = new Logger('[form-engine/actions/registry]', { debug: false });

/**
 * Action Registry
 *
 * Central registry for all plugin actions. Provides registration, validation,
 * and execution capabilities for custom action types.
 */
class ActionRegistry {
	private actions = new Map<string, RegisteredAction>();

	/**
	 * Register a new action type with its handler and configuration.
	 *
	 * @param def - Complete action definition
	 */
	register(def: RegisteredAction): void {
		if (this.actions.has(def.type)) {
			logger.warn(`Action type '${def.type}' is already registered. Overriding.`);
		}

		this.actions.set(def.type, def);
		logger.debug(`Registered action: ${def.type}`, {
			hasSchema: !!def.schema,
			defaultTriggers: def.defaultTriggers,
		});
	}

	/**
	 * Check if an action type is registered.
	 *
	 * @param type - Action type to check
	 * @returns True if action type is registered
	 */
	has(type: string): boolean {
		return this.actions.has(type);
	}

	/**
	 * Get a registered action definition.
	 *
	 * @param type - Action type to retrieve
	 * @returns Action definition or undefined if not found
	 */
	get(type: string): RegisteredAction | undefined {
		return this.actions.get(type);
	}

	/**
	 * Get default triggers for an action type.
	 *
	 * @param type - Action type to get triggers for
	 * @returns Array of default triggers or undefined if not found
	 */
	getDefaultTriggers(type: string): readonly ActionTrigger[] | undefined {
		return this.actions.get(type)?.defaultTriggers;
	}

	/**
	 * Execute an action using its registered handler.
	 *
	 * @param action - Action configuration to execute
	 * @param context - Execution context
	 * @returns Promise resolving to execution result
	 */
	async execute(action: any, context: ActionExecutionContext): Promise<ActionExecutionResult> {
		const def = this.actions.get(action.type);
		if (!def) {
			logger.error(`No handler registered for action type: ${action.type}`);
			return {
				success: false,
				error: `No handler registered for action type: ${action.type}`,
			};
		}

		if (def.schema) {
			try {
				def.schema.parse(action);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				logger.error(`Invalid action config for type '${action.type}':`, { error: errorMessage });
				return {
					success: false,
					error: `Invalid action config for type '${action.type}': ${errorMessage}`,
				};
			}
		}

		try {
			logger.debug(`Executing registered action: ${action.type}`, { actionId: action.id });
			const result = await def.handler(action, context);

			if (result.success) {
				logger.debug(`Action ${action.type} executed successfully`, { actionId: action.id });
			} else {
				logger.warn(`Action ${action.type} failed`, { actionId: action.id, error: result.error });
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(`Action handler threw error for type '${action.type}':`, {
				error: errorMessage,
			});
			return {
				success: false,
				error: `Action execution failed: ${errorMessage}`,
			};
		}
	}

	/**
	 * Get all registered action types.
	 *
	 * @returns Array of all registered action type names
	 */
	getRegisteredTypes(): string[] {
		return Array.from(this.actions.keys());
	}

	/**
	 * Clear all registered actions. Primarily for testing.
	 */
	clear(): void {
		this.actions.clear();
		logger.debug('Action registry cleared');
	}
}

/**
 * Global action registry instance.
 * Import this to register or execute plugin actions.
 */
export const actionRegistry = new ActionRegistry();

/**
 * Helper function to register an action.
 *
 * @param def - Action definition to register
 *
 * @example
 * ```typescript
 * registerAction({
 *   type: "my_action",
 *   handler: async (action, context) => ({ success: true }),
 *   schema: MyActionSchema,
 *   defaultTriggers: ["form_submit"]
 * });
 * ```
 */
export const registerAction = actionRegistry.register.bind(actionRegistry);
