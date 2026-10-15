import { logger } from '@/lib/logger';
import { useCallback, useEffect, useRef } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import type { FormActionTrigger, FormConfigView } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/forms/actions';

interface UseFormWatcherOptions {
	control: Control<any>;
	config: FormConfigView;
	onChange?: (data: any) => void;
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
	const handleFormChange = useCallback(
		async (data: any) => {
			if (config.actions && config.actions.length > 0) {
				await dispatchTrigger('form_change').catch((error) => {
					logger.error('Form change action execution failed:', error);
				});
			}

			if (onChange) onChange(data);
			if (config.onChange) config.onChange(data);
		},
		[config, onChange, dispatchTrigger],
	);

	const watchedData = useWatch({ control });
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		if (watchedData && Object.keys(watchedData).length > 0) {
			void handleFormChange(watchedData);
		}
	}, [watchedData, handleFormChange]);
}
