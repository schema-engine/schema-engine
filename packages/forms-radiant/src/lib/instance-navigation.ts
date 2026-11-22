import type { FormInstanceElement } from '@/components/form-instance.script';
import type { FormActions } from '@/adapters/radiant/form-actions';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import { collectStepFieldPaths, createStepMachine, createStepNavigator } from '@schema-engine/forms';
import type { FormStateContainer } from '@schema-engine/forms/state-container';
import { logger } from './logger';

/**
 * @remarks
 * Step triggers go to the instance's actions; a form that configures none dispatches nothing. A step is
 * checked with the container, over the step's own fields and with the native validity of the controls, and a
 * failed check re-validates those fields as the form's `reValidateMode` says. It marks nothing submitted, so a
 * later step stays clean.
 */
export function createInstanceNavigation(
	host: FormInstanceElement,
	readContainer: () => FormStateContainer | undefined,
	readRuiForm: () => RuiFormElement | null,
	readActions: () => FormActions | undefined,
) {
	const { navigate, cancel } = createStepNavigator({
		reduce: (state, action) => createStepMachine(host.config ?? { steps: [{}] })(state, action),
		getState: () => host.machine,
		setState: (machine) => {
			host.machine = machine;
		},
		validateStep: async (index) => {
			const container = readContainer();
			const ruiForm = readRuiForm();
			if (!container || !ruiForm) return false;
			const paths = collectStepFieldPaths(host.config.steps[index], container.getSnapshot().values);
			try {
				return await container.validate(paths, { native: ruiForm.readNativeValidity() });
			} catch (error) {
				logger.error('Step validation could not run', error);
				return false;
			}
		},
		dispatchTrigger: async (trigger) => readActions()?.dispatchTrigger(trigger),
	});

	return {
		markStepCompleted: (index: number): void => {
			host.machine = {
				...host.machine,
				completed: host.machine.completed.map((value, step) => step === index || value),
				valid: host.machine.valid.map((value, step) => step === index || value),
			};
		},
		markStepVisited: (index: number): void => {
			host.machine = {
				...host.machine,
				visited: host.machine.visited.map((value, step) => step === index || value),
			};
		},
		goToStep: (index: number): Promise<void> => navigate({ type: 'go-to', index }),
		goToNextStep: async (): Promise<void> => {
			if (readContainer()) await navigate({ type: 'next' });
		},
		goToPreviousStep: (): Promise<void> => navigate({ type: 'previous' }),
		cancel,
	};
}
