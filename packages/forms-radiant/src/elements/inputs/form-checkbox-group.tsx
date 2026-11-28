import { bindTo, customElement, prop, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAriaBindings, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiCheckboxGroup } from '@ecopages/radiant-ui/checkbox-group';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '../../lib/field-rules.js';
import { ChoiceHost, type ChoiceValue } from '../../lib/choice-host.js';
import { choiceControlOptions, choiceKeys, serializeChoiceValue } from '../../lib/choice-value.js';
import { registerHostControl } from '../../lib/control-host.js';
import { FieldGroup } from '../field-group.js';
import type { CheckboxGroupFieldProps } from './form-checkbox-group.types.js';

/** The selector of the control's own ARIA target: where the field paints its label, description and state. */
const ARIA_TARGET = '[data-checkbox-group-root]';

/**
 * @remarks
 * `value` is the list of the checked options' own values, while `rui-checkbox-group` holds the text of them.
 * The group announces a change through its checkbox inputs.
 */
@customElement('se-checkbox-group', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': ARIA_TARGET },
})
export class SeCheckboxGroup extends ChoiceHost<string[]> {
	declare readonly [JSX_PROPS]?: Partial<
		Pick<SeCheckboxGroup, 'name' | 'disabled' | 'value' | 'options' | 'orientation'>
	>;

	/** The field's context, painted onto the `ARIA_TARGET` by `fieldAriaBindings` (see `ControlHost`). */
	@contextSelector({ context: fieldContext })
	@state
	@bindTo(fieldAriaBindings(ARIA_TARGET))
	protected field?: FieldContextValue = undefined;

	@prop({ type: String }) orientation: 'horizontal' | 'vertical' = 'vertical';

	protected get controlTag(): string {
		return 'rui-checkbox-group';
	}

	protected override isValueEvent(target: Element): boolean {
		return target.localName === 'input' && this.control?.contains(target) === true;
	}

	protected override toControl(value: ChoiceValue): string[] {
		return choiceKeys(value);
	}

	protected override fromControl(held: unknown): ChoiceValue {
		return this.chosen(held, true);
	}

	override render(): JsxRenderable {
		return (
			<RuiCheckboxGroup
				name={this.name}
				orientation={this.orientation}
				disabled={this.disabled}
				options={choiceControlOptions(this.options)}
				value={this.toControl(this.value)}
			/>
		);
	}
}

registerHostControl('se-checkbox-group', { mode: 'wraps' });

export function FormCheckboxGroup(config: CheckboxGroupFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			authoredRequired={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			class={config.className}
			style={config.style}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<SeCheckboxGroup
				name={config.name}
				disabled={config.disabled}
				orientation={config.orientation}
				options={config.options}
				value={config.defaultValue}
			/>
		</FieldGroup>
	);
}
