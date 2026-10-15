import { logger } from '@/lib/logger';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useWatch, type Control, type FieldValues } from 'react-hook-form';
import type { FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/actions';

interface UseFormWatcherOptions {
	control: Control<FieldValues>;
	config: FormConfigView;
	onChange?: (data: FieldValues) => void;
	dispatchTrigger: (trigger: FormActionTrigger) => Promise<ActionExecutionResult[]>;
}

/**
 * Watches form changes and triggers form_change actions.
 * Handles both action dispatching and user-provided onChange callbacks.
 *
 * Policy: form_change actions are best-effort. Failures are logged but do not
 * block consumer onChange callbacks or form state updates.
 */
export function useFormWatcher({ control, config, onChange, dispatchTrigger }: UseFormWatcherOptions): void {
	const callbacks = useRef({ config, onChange, dispatchTrigger });
	const values = useWatch({ control, compute: (formValues) => formValues });
	const previousValues = useRef(values);

	useLayoutEffect(() => {
		callbacks.current = { config, onChange, dispatchTrigger };
	}, [config, onChange, dispatchTrigger]);

	useEffect(() => {
		if (Object.is(previousValues.current, values)) return;
		previousValues.current = values;

		const {
			config: currentConfig,
			onChange: currentOnChange,
			dispatchTrigger: currentDispatchTrigger,
		} = callbacks.current;

		void (async () => {
			if (currentConfig.actions && currentConfig.actions.length > 0) {
				await currentDispatchTrigger('form_change').catch((error) => {
					logger.error('Form change action execution failed:', error);
				});
			}

			currentOnChange?.(values);
			currentConfig.onChange?.(values);
		})();
	}, [values]);
}
