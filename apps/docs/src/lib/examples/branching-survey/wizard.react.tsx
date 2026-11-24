/** @jsxImportSource react */
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { WizardActionsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useViewContext } from '@schema-engine/forms-react/hooks';
import { defineRecipe, type FormShellProps } from '@schema-engine/forms-react/primitives';

const wizardSpec = defineRecipeSpec({
	$type: 'wizard',
	kind: 'wizard',
	slotSchemas: { actions: WizardActionsConfigSchema },
	metadata: { name: 'Wizard', category: 'wizard' },
});

/** The shell lays out what the recipe draws: the fields of the current step, then the controls. */
function Shell({ slots }: FormShellProps) {
	return (
		<div>
			{slots.content}
			{slots.actions}
		</div>
	);
}

/**
 * Previous, the step counter, and Next or the submit button.
 *
 * @remarks
 * Next and Submit carry distinct keys so React replaces the button instead of turning Next into a submit button
 * while its click is still being handled, which would submit the form on arriving at the last step.
 */
function Controls() {
	const { navigation, form, steps, currentStepIndex } = useViewContext();
	return (
		<div>
			<button type="button" onClick={navigation.goToPreviousStep} disabled={navigation.isFirstStep}>
				Previous
			</button>
			<span aria-live="polite">
				Step {currentStepIndex + 1} of {steps.length}
			</span>
			{navigation.isLastStep ? (
				<button key="submit" type="submit">
					{form.isSubmitting ? 'Sending' : 'Send answers'}
				</button>
			) : (
				<button key="next" type="button" onClick={navigation.goToNextStep} disabled={!navigation.canGoNext}>
					Next
				</button>
			)}
		</div>
	);
}

export const WizardRecipe = defineRecipe(wizardSpec, { shell: Shell, slots: { actions: Controls } });
