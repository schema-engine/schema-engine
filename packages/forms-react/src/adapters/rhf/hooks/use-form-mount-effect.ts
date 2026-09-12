import { useEffect, useRef } from 'react';
import type { FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/actions';

interface UseFormMountEffectOptions {
	actions: FormConfigView['actions'];
	dispatchTrigger: (trigger: FormActionTrigger) => Promise<ActionExecutionResult[]>;
}

/**
 * Executes 'form_mount' actions when the form component mounts.
 * This effect runs only once when the component mounts.
 */
export function useFormMountEffect({ actions, dispatchTrigger }: UseFormMountEffectOptions): void {
	const hasRunRef = useRef(false);

	useEffect(() => {
		if (hasRunRef.current || !actions || actions.length === 0) {
			return;
		}

		hasRunRef.current = true;

		const runMount = async () => {
			try {
				await dispatchTrigger('form_mount');
			} catch (error) {
				console.error('Form mount action execution failed:', error);
			}
		};

		void runMount();
	}, [actions, dispatchTrigger]);
}
