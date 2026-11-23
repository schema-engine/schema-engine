import { bindTo, customElement, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAriaBindings, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { ChoiceHost, type ChoiceValue } from '@/lib/choice-host';
import { choiceControlOptions, choiceKeys, choiceValueOf } from '@/lib/choice-value';
import { registerHostControl } from '@/lib/control-host';
import { FieldGroup } from '../field-group';
import type { RadioFieldProps } from './form-radio.types';

/** The selector of the control's own ARIA target: where the field paints its label, description and state. */
const ARIA_TARGET = '[data-radio-group-root]';

/**
 * @remarks
 * `value` is the chosen option's own value, while `rui-radio-group` holds its text. The group announces a
 * choice through its radio inputs.
 */
@customElement('se-radio-group', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': ARIA_TARGET },
})
export class SeRadioGroup extends ChoiceHost<string> {
	declare readonly [JSX_PROPS]?: Partial<Pick<SeRadioGroup, 'name' | 'disabled' | 'value' | 'options'>>;

	/** The field's context, painted onto the `ARIA_TARGET` by `fieldAriaBindings` (see `ControlHost`). */
	@contextSelector({ context: fieldContext })
	@state
	@bindTo(fieldAriaBindings(ARIA_TARGET))
	protected field?: FieldContextValue = undefined;

	protected get controlTag(): string {
		return 'rui-radio-group';
	}

	protected override isValueEvent(target: Element): boolean {
		return target.localName === 'input' && this.control?.contains(target) === true;
	}

	protected override toControl(value: ChoiceValue): string {
		return choiceKeys(value)[0] ?? '';
	}

	protected override fromControl(held: unknown): ChoiceValue {
		const key = choiceKeys(held)[0];
		return key === undefined ? '' : choiceValueOf(this.options, key);
	}

	override render(): JsxRenderable {
		return (
			<RuiRadioGroup
				name={this.name}
				options={choiceControlOptions(this.options).map((option) => ({
					...option,
					disabled: option.disabled || this.disabled,
				}))}
				value={this.toControl(this.value)}
			/>
		);
	}
}

registerHostControl('se-radio-group', { mode: 'wraps' });

export function FormRadio(config: RadioFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			authoredRequired={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			class={config.className}
			style={config.style}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<SeRadioGroup
				name={config.name}
				disabled={config.disabled}
				options={config.options}
				value={config.defaultValue}
			/>
		</FieldGroup>
	);
}
