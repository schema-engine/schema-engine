import { useRef } from 'react';
import { ActionExecutor } from '@schema-engine/forms/actions/index';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { createDispatcher, type ActionExecutorWithDispatcher } from '@/lib/create-dispatcher';

/**
 * Custom hook to manage ActionExecutor instance with dispatcher utilities
 *
 * This hook provides an enhanced ActionExecutor instance tied to a specific FormEngine.
 * The instance is lazily initialized on first use and recreated when the engine changes.
 *
 * The returned executor includes convenience dispatcher methods:
 * - dispatchTrigger: Execute triggers with metadata merging and result handling
 * - dispatchTriggerSync: Fire-and-forget trigger execution
 *
 * @param engine - FormEngine instance to use for action execution (required)
 * @returns Enhanced ActionExecutor instance with dispatcher methods
 */
export function useActionExecutor(engine: FormEngine): ActionExecutorWithDispatcher {
	const actionExecutorRef = useRef<ActionExecutorWithDispatcher | null>(null);
	const engineRef = useRef<FormEngine | null>(null);

	if (!actionExecutorRef.current || engineRef.current !== engine) {
		const baseExecutor = new ActionExecutor(engine);
		actionExecutorRef.current = createDispatcher(baseExecutor);
		engineRef.current = engine;
	}

	return actionExecutorRef.current;
}
