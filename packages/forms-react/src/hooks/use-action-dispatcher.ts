import { useRef } from 'react';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { ActionDispatcher } from '@schema-engine/actions';

/**
 * Custom hook to manage ActionDispatcher instance for form actions
 *
 * This hook provides an ActionDispatcher instance tied to a specific FormEngine.
 * The instance is lazily initialized on first use and recreated when the engine changes.
 *
 * @param engine - FormEngine instance to use as the action registry (required)
 * @returns ActionDispatcher instance for executing form actions
 */
export function useActionDispatcher(engine: FormEngine) {
	const dispatcherRef = useRef<InstanceType<typeof ActionDispatcher> | null>(null);
	const engineRef = useRef<FormEngine | null>(null);

	if (!dispatcherRef.current || engineRef.current !== engine) {
		dispatcherRef.current = new ActionDispatcher(engine);
		engineRef.current = engine;
	}

	return dispatcherRef.current;
}
