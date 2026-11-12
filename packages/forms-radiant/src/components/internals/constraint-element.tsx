import { bindTo, onUpdated, prop, RadiantElement } from '@ecopages/radiant';
import {
	ContextSubscriptionRequestEvent,
	onContextUpdate,
	provideContext,
	type ContextProvider,
} from '@ecopages/radiant/context';
import type { JSX_PROPS } from '@ecopages/jsx';
import { evaluateConstraints, resolveConstraintPaths } from '@schema-engine/forms/constraints';
import { getValueAtPath } from '@schema-engine/forms/lib/path-values';
import type { ConstraintLogic } from '@schema-engine/forms/schemas';
import {
	constraintContext,
	formValuesContext,
	type ConstraintState,
	type FormValuesContextValue,
} from '@/contexts/constraint-context';
import { formElement } from '@/lib/define-element';

const NO_CONSTRAINTS: ConstraintState = { disabled: false, required: false };

/**
 * Evaluates the constraints of one element and applies them to everything inside it.
 *
 * @remarks
 * The view renders the element from a constraint snapshot and passes whether it is
 * concealed, which the host paints as `hidden` so markup rendered through the Radiant
 * server bridge carries it; the plain `hidden` the view passes too covers markup
 * rendered without the bridge. Until the
 * instance publishes values the host keeps that snapshot. The host re-evaluates only when a
 * value one of its constraints reads changed, so typing in an unrelated field costs it
 * a comparison. It provides `constraintContext` with its own `disabled` and `required`
 * composed with those of the wrappers around it, which is what the fields inside read.
 *
 * The view passes the constraints as the JSON attribute `data-se-constraints`, because a
 * server-rendered host reaches the client only through its attributes.
 *
 * @element se-constraint
 */
@formElement('se-constraint')
export class ConstraintElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: {
		'data-se-constraint-field': string;
		'data-se-constraints': string;
		'data-se-base-required'?: '';
		concealed?: boolean;
	};

	/** Rendered path of the constrained element; scopes the sibling lookups of its constraints. */
	@prop({ type: String, attribute: 'data-se-constraint-field' }) fieldPath = '';
	@prop({ type: Array, attribute: 'data-se-constraints' }) constraints: ConstraintLogic[] = [];
	@prop({ type: Boolean, attribute: 'data-se-base-required' }) baseRequired = false;

	/**
	 * @remarks
	 * Read from the server-rendered `hidden` attribute when the host upgrades, so hydration
	 * keeps the snapshot until the first evaluation.
	 */
	@prop({ type: Boolean, attribute: 'hidden' })
	@bindTo({ bool: 'hidden' })
	concealed = false;

	@provideContext<typeof constraintContext>({ context: constraintContext, initialValue: undefined })
	protected provider!: ContextProvider<typeof constraintContext>;

	private values?: Record<string, unknown>;
	private watched?: unknown[];
	private own?: ConstraintState;
	private inherited = NO_CONSTRAINTS;

	/**
	 * @remarks
	 * The request starts at the parent: this host provides the same context, so a request
	 * from the host itself would be answered by its own provider and never reach the
	 * wrapper around it.
	 */
	protected override onConnected(): void {
		this.inherited = NO_CONSTRAINTS;
		this.parentElement?.dispatchEvent(
			new ContextSubscriptionRequestEvent(
				constraintContext,
				(inherited) => {
					this.inherited = inherited ?? NO_CONSTRAINTS;
					this.publish();
				},
				undefined,
				true,
				(unsubscribe) => this.registerCleanupCallback(unsubscribe),
			),
		);
	}

	@onContextUpdate({ context: formValuesContext, requestUpdate: false })
	onFormValues(form: FormValuesContextValue | undefined): void {
		this.values = form?.values;
		this.evaluate();
	}

	@onUpdated(['fieldPath', 'constraints', 'baseRequired'])
	onConstraintsUpdated(): void {
		this.watched = undefined;
		this.evaluate();
	}

	private evaluate(): void {
		const { values, constraints, fieldPath } = this;
		if (!values || constraints.length === 0) return;
		const watched = resolveConstraintPaths(constraints, fieldPath).map((path) => getValueAtPath(values, path));
		if (this.watched?.every((value, index) => Object.is(value, watched[index]))) return;
		this.watched = watched;

		const { shouldShow, shouldDisable, isRequired } = evaluateConstraints({
			constraints,
			baseRequired: this.baseRequired,
			fieldPath,
			values,
		});
		this.concealed = !shouldShow;
		this.own = { disabled: shouldDisable, required: isRequired };
		this.publish();
	}

	private publish(): void {
		if (!this.own) return;
		const next: ConstraintState = {
			disabled: this.own.disabled || this.inherited.disabled,
			required: this.own.required || this.inherited.required,
		};
		const current = this.provider.getContext();
		if (current?.disabled === next.disabled && current.required === next.required) return;
		this.provider.setContext(next);
	}
}
