import type { FormInstanceElement } from '@/components/form-instance.script';
import type { FormController } from '@/adapters/radiant/controller';
import { collectStepFieldPaths } from '@schema-engine/forms';
import { validateCurrentStepFields } from './validate-current-step';

export function createInstanceNavigation(host: FormInstanceElement, readForm: () => FormController | undefined) {
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
		goToStep: (index: number): void => host.transition({ type: 'go-to', index }),
		goToNextStep: async (): Promise<void> => {
			const form = readForm();
			if (!form?.store || host.currentStep >= host.config.steps.length - 1) return;
			const isValid = await validateCurrentStepFields(
				form.store,
				collectStepFieldPaths(host.config.steps[host.currentStep], form.getValues()),
			);
			host.transition({ type: 'next', isValid });
		},
		goToPreviousStep: (): void => host.transition({ type: 'previous' }),
	};
}
