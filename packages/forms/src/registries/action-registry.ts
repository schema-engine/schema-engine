import type { BuilderActionRegistration } from '@/types';
import { BaseRegistry } from './base-registry';

/**
 * Action Registry
 *
 * Manages registration and retrieval of form actions.
 * Actions are event handlers that execute in response to form events.
 *
 * Note: This registry only handles storage. Action execution logic
 * is handled by ActionExecutor.
 *
 * Note: Uses BuilderActionRegistration<any> internally to support registrations with different
 * config types. Type safety is maintained at the registration site via the builder.
 */
export class ActionRegistry extends BaseRegistry<string, BuilderActionRegistration<any>> {
	get registryName(): string {
		return 'action';
	}

	/**
	 * Get default triggers for an action type.
	 *
	 * @param id - Action ID to get triggers for
	 * @returns Array of default triggers or undefined if not found
	 */
	getDefaultTriggers(id: string): readonly string[] | undefined {
		return this.get(id)?.metadata?.defaultTriggers;
	}
}
