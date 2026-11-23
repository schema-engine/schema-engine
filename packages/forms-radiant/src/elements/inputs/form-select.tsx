import { bindTo, customElement, prop, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAriaBindings, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import {
	RuiListbox,
	RuiSelect,
	RuiSelectClear,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import { RuiTagGroup } from '@ecopages/radiant-ui/tag-group';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '@/lib/field-rules';
import { ChoiceHost, type ChoiceValue } from '@/lib/choice-host';
import { choiceControlOptions, choiceKeys, serializeChoiceValue } from '@/lib/choice-value';
import { registerHostControl } from '@/lib/control-host';
import { FieldGroup } from '../field-group';
import type { SelectFieldProps } from './form-select.types';

/** The selector of the control's own ARIA target: where the field paints its label, description and state. */
const ARIA_TARGET = '[data-select-trigger]';

/**
 * @remarks
 * `value` is the option's own value, or a list of them with `multiple`, while `rui-select` holds the text of
 * the chosen options' values as a list.
 */
@customElement('se-select', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': ARIA_TARGET },
})
export class SeSelect extends ChoiceHost<string[]> {
	declare readonly [JSX_PROPS]?: Partial<
		Pick<SeSelect, 'name' | 'disabled' | 'value' | 'options' | 'multiple' | 'placeholder'>
	>;

	/** The field's context, painted onto the `ARIA_TARGET` by `fieldAriaBindings` (see `ControlHost`). */
	@contextSelector({ context: fieldContext })
	@state
	@bindTo(fieldAriaBindings(ARIA_TARGET))
	protected field?: FieldContextValue = undefined;

	@prop({ type: Boolean, defaultValue: false }) multiple = false;
	@prop({ type: String }) placeholder = '';

	protected get controlTag(): string {
		return 'rui-select';
	}

	protected override toControl(value: ChoiceValue): string[] {
		return choiceKeys(value);
	}

	protected override fromControl(held: unknown): ChoiceValue {
		return this.chosen(held, this.multiple);
	}

	override render(): JsxRenderable {
		const selectionMode = this.multiple ? 'multiple' : 'single';
		return (
			<RuiSelect
				placeholder={this.placeholder}
				disabled={this.disabled}
				selectionMode={selectionMode}
				value={this.toControl(this.value)}
			>
				<RuiSelectControl>
					<RuiSelectTrigger disabled={this.disabled}>
						<RuiSelectValue>{this.multiple ? <RuiTagGroup embedded /> : null}</RuiSelectValue>
					</RuiSelectTrigger>
					<RuiSelectClear disabled={this.disabled} />
					<RuiSelectToggle disabled={this.disabled} />
				</RuiSelectControl>
				<RuiSelectListbox>
					<RuiListbox embedded selectionMode={selectionMode} options={choiceControlOptions(this.options)} />
				</RuiSelectListbox>
			</RuiSelect>
		);
	}
}

registerHostControl('se-select', { mode: 'wraps' });

export function FormSelect(config: SelectFieldProps) {
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
			<SeSelect
				name={config.name}
				disabled={config.disabled}
				options={config.options}
				multiple={Boolean(config.multiple)}
				placeholder={config.placeholder}
				value={config.defaultValue}
			/>
		</FieldGroup>
	);
}
