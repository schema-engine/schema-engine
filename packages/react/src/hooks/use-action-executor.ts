import { useRef } from 'react';
import { ActionExecutor } from '@json-form-engine/core/actions/index';
import type { FormEngine } from '@json-form-engine/core/engine/form-engine';

/**
 * Custom hook to manage ActionExecutor instance
 *
 * This hook provides an ActionExecutor instance tied to a specific FormEngine.
 * The instance is lazily initialized on first use and recreated when the engine changes.
 *
 * @param engine - FormEngine instance to use for action execution (required)
 * @returns ActionExecutor instance
 */
export function useActionExecutor(engine: FormEngine): ActionExecutor {
	const actionExecutorRef = useRef<ActionExecutor | null>(null);
	const engineRef = useRef<FormEngine | null>(null);

	// Recreate executor if engine changes
	if (!actionExecutorRef.current || engineRef.current !== engine) {
		actionExecutorRef.current = new ActionExecutor(engine);
		engineRef.current = engine;
	}

	return actionExecutorRef.current;
}
