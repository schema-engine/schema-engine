import type { FormInstanceElement } from '@/components/form-instance.script';
import type { FormActionControllerElement } from '@/components/form-action-controller';
import type { FormController } from '@/adapters/radiant/controller';
import { collectStepFieldPaths, createStepMachine, createStepNavigator } from '@schema-engine/forms';
import { validateCurrentStepFields } from './validate-current-step';

/**
 * @remarks Step triggers go to the descendant `se-form-action-controller`; without one, navigation
 * dispatches nothing.
 */
export function createInstanceNavigation(host: FormInstanceElement, readForm: () => FormController | undefined) {
	const { navigate, cancel } = createStepNavigator({
		reduce: (state, action) => createStepMachine(host.config ?? { steps: [{}] })(state, action),
		getState: () => host.machine,
		setState: (machine) => {
			host.machine = machine;
		},
		validateStep: async (index) => {
			const form = readForm();
			if (!form?.store) return false;
			return validateCurrentStepFields(
				form.store,
				collectStepFieldPaths(host.config.steps[index], form.getValues()),
			);
		},
		dispatchTrigger: async (trigger) =>
			host.querySelector<FormActionControllerElement>('se-form-action-controller')?.dispatchTrigger(trigger),
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
			if (readForm()?.store) await navigate({ type: 'next' });
		},
		goToPreviousStep: (): Promise<void> => navigate({ type: 'previous' }),
		cancel,
	};
}
