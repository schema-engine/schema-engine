import { customElement, onUpdated, prop, RadiantElement } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';

/**
 * Visibility host for one authored step.
 *
 * @remarks
 * The `FormRenderer` view authors every step's fields once inside this host.
 * There is no render override and no slot projection: the host toggles its own
 * `hidden` attribute, so step switching is pure DOM and SSR emits the full form
 * with only the active step visible. The initial `hidden` arrives as a prop from
 * the view (step 0 active for wizards); the live `formInstanceContext` takes
 * over after hydration. Until an instance value arrives, the host assumes the
 * props default (step 0 active), so hydrating a step-0 host never flashes it
 * hidden while the context is still settling.
 *
 * @element se-form-step
 */
@customElement('se-form-step')
export class FormStepElement extends RadiantElement {
	@prop({ type: Number, defaultValue: 0 }) stepIndex = 0;
	@prop({ type: Boolean, defaultValue: false }) isWizard = false;

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	applyStepState(instance: FormInstanceContextValue | undefined): void {
		const activeStep = instance?.currentStep ?? 0;
		this.toggleAttribute('hidden', this.isWizard && activeStep !== this.stepIndex);
	}

	@onUpdated(['isWizard', 'stepIndex'])
	onStepPropsUpdated(): void {
		this.applyStepState(undefined);
	}
}

export function FormStep({
	stepIndex,
	isWizard = false,
	children,
}: {
	stepIndex: number;
	isWizard?: boolean;
	children: JsxRenderable;
}): JsxRenderable {
	return jsx('se-form-step', {
		stepIndex,
		isWizard,
		hidden: isWizard && stepIndex !== 0,
		children,
	});
}
