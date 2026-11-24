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
import { selectFieldState, type FormStateContainer } from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';

/** RuiField's registration and presentation, restoring the required state and defaults. */
@customElement('se-field')
export class FormFieldElement extends RuiFieldElement {
	private container?: FormStateContainer;
	private stopObserving?: () => void;
	private constrainedDisabled = false;

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
		if (container) this.stopObserving = container.subscribe(() => this.applyConstraint());
		this.applyConstraint();
	}

	override disconnectedCallback(): void {
		this.stopObserving?.();
		this.stopObserving = undefined;
		this.container = undefined;
		super.disconnectedCallback();
	}

	/**
	 * Applies what the form's constraints say about this field: the container's state at its path.
	 *
	 * @remarks
	 * The state already has the authored `disabled` of the field and of the containers around it, and the
	 * `require` and `disable` constraints of those containers, folded in by the engine, so the field only follows
	 * it. A field the state never disabled keeps what render gave it, and one it released goes back to enabled.
	 * Validating a field whose requirement changed is the state container's.
	 */
	private applyConstraint(): void {
		const { container } = this;
		if (!container) return;
		const { disabled, required } = selectFieldState(
			container.getSnapshot(),
			this.getAttribute('name') ?? this.name,
		);
		if (disabled || this.constrainedDisabled) this.disabled = disabled;
		this.constrainedDisabled = disabled;
		this.showRequired(required || this.authoredRequired);
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
