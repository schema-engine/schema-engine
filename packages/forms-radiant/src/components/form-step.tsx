import { bindTo, customElement, onUpdated, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';

/**
 * Visibility host for one authored step.
 *
 * @remarks
 * The `FormRenderer` view authors every step's fields once inside this host.
 * There is no render override and no slot projection: the host binds its own
 * `hidden` attribute to a flag derived from the instance context, so step
 * switching is pure DOM and SSR emits the full form with only the active step
 * visible. The view also passes the initial `hidden` attribute (step 0 active for
 * wizards). Until an instance value arrives the host keeps the attribute the
 * view wrote.
 *
 * @element se-form-step
 */
@customElement('se-form-step')
export class FormStepElement extends RadiantElement {
	@prop({ type: Number, defaultValue: 0 }) stepIndex = 0;

	@state
	@bindTo({ bool: 'hidden' })
	private hiddenStep = false;

	private instance?: FormInstanceContextValue;

	protected override onConnected(): void {
		this.hiddenStep = this.hasAttribute('hidden');
	}

	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onInstance(instance: FormInstanceContextValue | undefined): void {
		this.instance = instance;
		this.syncHidden();
	}

	@onUpdated(['stepIndex'])
	onStepIndexUpdated(): void {
		this.syncHidden();
	}

	/**
	 * @remarks
	 * The instance publishes before it has resolved its engine, with `isWizard` false, so a non-wizard value is
	 * ignored rather than unhiding the steps the server rendered hidden.
	 */
	private syncHidden(): void {
		const { instance } = this;
		if (!instance?.isWizard) return;
		this.hiddenStep = instance.currentStep !== this.stepIndex;
	}
}

export function FormStep({
	stepIndex,
	hidden = false,
	children,
}: {
	stepIndex: number;
	/** The server-rendered visibility: true for every step but the first of a wizard. */
	hidden?: boolean;
	children: JsxRenderable;
}): JsxRenderable {
	return jsx('se-form-step', {
		stepIndex,
		hidden,
		children,
	});
}
