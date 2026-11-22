import { useEffect, useLayoutEffect, useRef } from 'react';
import { hasConfiguredActions, type FormActionTrigger, type FormConfigView } from '@schema-engine/forms';
import type { ActionExecutionResult } from '@schema-engine/forms/actions';
import type { FormStateContainer } from '@schema-engine/forms/state-container';
import type { FormValues } from '@/hooks/form-state/types';
import { logger } from '@/lib/logger';

interface UseFormChangeEffectOptions {
	container: FormStateContainer;
	config: FormConfigView;
	onChange?: (data: FormValues) => void;
	dispatchTrigger: (trigger: FormActionTrigger) => Promise<ActionExecutionResult[]>;
}

/**
 * Triggers `form_change` actions and the consumer's `onChange` when the form's values change.
 *
 * @remarks
 * A change is a new `values` tree in the container's snapshot, so an error, a touch or a validation result
 * is never one. The values the form started from are the first to compare with, so a value a child wrote
 * during mount, before this subscribed, is still reported. The callbacks are read when the change happens,
 * so a re-render in the same commit does not call a stale one.
 *
 * Policy: `form_change` actions are best-effort. Failures are logged and do not block the consumer's
 * `onChange` or the form's state.
 */
export function useFormChangeEffect({
	container,
	config,
	onChange,
	dispatchTrigger,
}: UseFormChangeEffectOptions): void {
	const callbacks = useRef({ config, onChange, dispatchTrigger });
	const previousValues = useRef(container.getServerSnapshot().values);

	useLayoutEffect(() => {
		callbacks.current = { config, onChange, dispatchTrigger };
	}, [config, onChange, dispatchTrigger]);

	useEffect(() => {
		const report = () => {
			const { values } = container.getSnapshot();
			if (Object.is(previousValues.current, values)) return;
			previousValues.current = values;

			const { config: currentConfig, onChange: currentOnChange, dispatchTrigger: dispatch } = callbacks.current;
			if (hasConfiguredActions(currentConfig)) {
				dispatch('form_change').catch((error) => {
					logger.error('Form change action execution failed:', error);
				});
			}
			currentOnChange?.(values);
		};

		report();
		return container.subscribe(report);
	}, [container]);
}
