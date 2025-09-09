import { useRef } from 'react';
import { ActionExecutor } from '../actions/index';

/**
 * Custom hook to manage ActionExecutor instance
 *
 * This hook provides a singleton ActionExecutor instance that persists
 * across component re-renders. The instance is lazily initialized on first use.
 *
 * @returns ActionExecutor instance
 */
export function useActionExecutor(): ActionExecutor {
	const actionExecutorRef = useRef<ActionExecutor | null>(null);

	if (!actionExecutorRef.current) {
		actionExecutorRef.current = new ActionExecutor();
	}

	return actionExecutorRef.current;
}
