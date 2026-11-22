import {
	GRID_ITEM_CLASS,
	getAppearanceAttributes,
	type AppearanceSelection,
	type ElementGridConfig,
} from '@schema-engine/layout';
import { RuiFieldElement, type RuiFieldProps } from '@ecopages/radiant-ui/field';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { bindTo, customElement, onUpdated, prop, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { constraintContext, formValuesContext, type ConstraintState } from '@/contexts/constraint-context';

/** RuiField's registration and presentation, restoring the required state and defaults. */
@customElement('se-field')
export class FormFieldElement extends RuiFieldElement {
	private constraint?: ConstraintState;
	private isAuthoredDisabled?: (renderedPath: string) => boolean;

	/**
	 * Whether the config authors the field required. `required` follows it and the constraints around the field,
	 * so this keeps what the config said.
	 */
	@prop({ type: Boolean, attribute: 'data-se-required' }) authoredRequired = false;

	/**
	 * Whether the required marker is shown.
	 *
	 * @remarks
	 * Paints the marker `FieldGroup` renders, server-rendered or not, so the hydrated markup is reused.
	 */
	@state
	@bindTo({ selector: '[data-se-required-marker]', bool: 'hidden', invert: true })
	private requiredShown = false;

	protected override onConnected(): void {
		this.hydrateDefaultValue();
		this.showRequired(this.authoredRequired);
		super.onConnected();
		this.applyConstraint();
	}

	@onUpdated(['authoredRequired'])
	onAuthoredRequired(): void {
		this.applyConstraint();
	}

	@onContextUpdate({ context: constraintContext, requestUpdate: false })
	onConstraint(constraint: ConstraintState | undefined): void {
		this.constraint = constraint;
		this.applyConstraint();
	}

	@onContextUpdate({
		context: formValuesContext,
		select: (form) => form?.isAuthoredDisabled,
		requestUpdate: false,
	})
	onAuthoredDisabled(isAuthoredDisabled: ((renderedPath: string) => boolean) | undefined): void {
		this.isAuthoredDisabled = isAuthoredDisabled;
		this.applyConstraint();
	}

	/**
	 * Composes the field's authored state with the constraint wrappers around it.
	 *
	 * @remarks
	 * A field outside every wrapper never receives a constraint and keeps what render gave it. The live
	 * `disabled` already holds what a constraint applied at render, so the authored state comes from the
	 * config lookup. It waits for the constraint context and the authored-disabled lookup, so an authored
	 * `disabled` is never lifted while the lookup is still on its way; a field inside a wrapper that has not
	 * evaluated yet keeps its render state too. Validating a field whose requirement changed is the state
	 * container's, which reads the constraints.
	 */
	private applyConstraint(): void {
		const { constraint, isAuthoredDisabled } = this;
		if (!constraint || !isAuthoredDisabled) return;
		const name = this.getAttribute('name') ?? this.name;

		this.disabled = isAuthoredDisabled(name) || constraint.disabled;
		this.showRequired(constraint.required || this.authoredRequired);
	}

	/** What the field announces (`aria-required`) and the label marker shows; neither validates anything. */
	private showRequired(required: boolean): void {
		this.requiredShown = required;
		this.required = required;
	}

	/**
	 * @remarks
	 * RuiField prefers its object prop over the JSON attribute. Radiant exposes an
	 * absent object prop as `null` during hydration, so decode the attribute first
	 * to prevent null from erasing a server-rendered field default.
	 */
	private hydrateDefaultValue(): void {
		if (this.defaultValue !== null) return;

		const raw = this.defaultValueData ?? this.getAttribute('data-default-value');
		if (!raw) {
			this.defaultValue = undefined;
			return;
		}

		try {
			this.defaultValue = JSON.parse(raw) as unknown;
		} catch {
			this.defaultValue = undefined;
		}
	}
}

/**
 * @remarks
 * `required` is the config's own requirement, as a field label shows it. It reaches the field as an
 * attribute and as the field's presentational `required`, so a server-rendered field has `aria-required` and a hydrated one restores it.
 * Validation is not here: the form's state container runs the engine rules.
 */
export function FormField({
	children,
	required,
	defaultValue,
	defaultValueData,
	class: className,
	grid,
	style,
	appearance,
	...props
}: Omit<JsxCustomElementAttributes<FormFieldElement, RuiFieldProps>, 'rules' | 'required'> & {
	appearance?: AppearanceSelection;
	required?: boolean;
	grid?: ElementGridConfig;
	style?: Record<string, string | number | undefined>;
}) {
	const fieldHost = mergeFieldGridHost(grid, style);

	return (
		<FormFieldElement
			{...props}
			classes={['se-form-field', GRID_ITEM_CLASS, className]}
			data-se-theme={fieldHost.themeId}
			style={fieldHost.style}
			{...getAppearanceAttributes(appearance)}
			required={required}
			data-se-required={required ? '' : undefined}
			defaultValue={defaultValue}
			data={{
				defaultValue:
					defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined),
			}}
		>
			<div class="rui-field" data-ref="field">
				{children}
			</div>
		</FormFieldElement>
	);
}
