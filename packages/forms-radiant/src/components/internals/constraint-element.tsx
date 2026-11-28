import { customElement, onUpdated, prop, RadiantElement } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import type { JSX_PROPS } from '@ecopages/jsx';
import { selectFieldState, type FormStateContainer } from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue } from '../../contexts/form-instance-context.js';

/**
 * Shows or hides one element as the form's constraints say.
 *
 * @remarks
 * The state is the container's: `selectFieldState` at this host's path says whether the element is hidden, from
 * the one ordered evaluation of the form's constraints, with the constraints of the containers around it folded
 * in. So the host evaluates nothing itself, and it agrees with validation and with the other renderer. The
 * fields inside read their own `disabled` and `required` the same way. The view passes whether the element is hidden as the plain `hidden`
 * attribute, which is the one source of truth until the instance has a container: the host writes the native
 * `hidden` property and declares no binding for it, because a `@bindTo` on `hidden` would make the Radiant server
 * bridge drop the attribute whenever the prop is false.
 *
 * @element se-constraint
 */
@customElement('se-constraint')
export class ConstraintElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: {
		'data-se-constraint-field': string;
		hidden?: boolean;
	};

	/** Rendered path of the constrained element, which the container's state is read at. */
	@prop({ type: String, attribute: 'data-se-constraint-field' }) fieldPath = '';

	private container?: FormStateContainer;
	private stopObserving?: () => void;

	@onContextUpdate({
		context: formInstanceContext,
		select: (instance: FormInstanceContextValue | undefined) => instance?.runtime?.container,
		requestUpdate: false,
	})
	onContainer(container: FormStateContainer | undefined): void {
		if (container === this.container) return;
		this.stopObserving?.();
		this.stopObserving = undefined;
		this.container = container;
		if (container) this.stopObserving = container.subscribe(() => this.apply());
		this.apply();
	}

	override disconnectedCallback(): void {
		this.stopObserving?.();
		this.stopObserving = undefined;
		this.container = undefined;
		super.disconnectedCallback();
	}

	@onUpdated(['fieldPath'])
	onFieldPath(): void {
		this.apply();
	}

	private apply(): void {
		const { container, fieldPath } = this;
		if (!container) return;
		const { hidden } = selectFieldState(container.getSnapshot(), fieldPath);
		this.hidden = hidden;
	}
}
