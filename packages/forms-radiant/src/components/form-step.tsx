import { customElement, bindTo, onUpdated, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
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
	declare readonly [JSX_PROPS]?: { stepIndex?: number };

	@prop({ type: Number, defaultValue: 0 }) stepIndex = 0;

	@state
	@bindTo({ bool: 'hidden' })
	private hiddenStep = false;

	private instance?: FormInstanceContextValue;

	/**
	 * @remarks
	 * The view writes `hidden` once, for the server-rendered markup. From connect on the
	 * host owns it through `hiddenStep` and follows every value the instance publishes,
	 * so a view update never competes with the current step.
	 */
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

	private syncHidden(): void {
		const { instance } = this;
		if (instance?.isWizard === undefined) return;
		this.hiddenStep = instance.isWizard && instance.currentStep !== this.stepIndex;
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
	return (
		<FormStepElement stepIndex={stepIndex} hidden={hidden}>
			{children}
		</FormStepElement>
	);
}
