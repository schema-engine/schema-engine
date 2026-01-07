import { useEffect } from 'react';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/actions';

interface UseFormMountEffectOptions {
	actions: FormActionConfig[] | undefined;
	dispatchTrigger: (trigger: FormActionTrigger) => Promise<ActionExecutionResult[]>;
}

/**
 * Executes 'form_mount' actions when the form component mounts.
 * This effect runs only once when the component mounts.
 */
export function useFormMountEffect({ actions, dispatchTrigger }: UseFormMountEffectOptions): void {
	useEffect(() => {
		if (!actions || actions.length === 0) {
			return;
		}

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
