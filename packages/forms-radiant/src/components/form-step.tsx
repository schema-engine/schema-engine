import { customElement, bindTo, onUpdated, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { getAppearanceAttributes, type AppearanceSelection } from '@schema-engine/layout';

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
	declare readonly [JSX_PROPS]?: { stepId?: string };

	@prop({ type: String, defaultValue: '' }) stepId = '';

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

	@onUpdated(['stepId'])
	onStepIdUpdated(): void {
		this.syncHidden();
	}

	private syncHidden(): void {
		const { instance } = this;
		if (instance?.isWizard === undefined) return;
		this.hiddenStep = instance.isWizard && instance.current !== this.stepId;
	}
}

export function FormStep({
	stepId,
	hidden = false,
	class: className,
	style,
	appearance,
	children,
}: {
	stepId: string;
	/** The server-rendered visibility: true for every step but the first of a wizard. */
	hidden?: boolean;
	/** The step's authored `className`. */
	class?: string;
	/** The step's authored custom properties. */
	style?: Record<string, string | number | undefined>;
	/** The step's resolved appearance, emitted as `data-se-<axis>` attributes. */
	appearance?: AppearanceSelection;
	children: JsxRenderable;
}): JsxRenderable {
	return (
		<FormStepElement
			stepId={stepId}
			hidden={hidden}
			classes={['se-form-step', className]}
			style={style}
			data-se-step={stepId}
			{...getAppearanceAttributes(appearance)}
		>
			{children}
		</FormStepElement>
	);
}
