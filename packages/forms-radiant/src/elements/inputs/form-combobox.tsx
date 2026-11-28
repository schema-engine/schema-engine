import { bindTo, customElement, prop, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { fieldAriaBindings, fieldContext, type FieldContextValue } from '@ecopages/radiant-ui/field';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import {
	RuiCombobox,
	RuiComboboxClear,
	RuiComboboxControl,
	RuiComboboxInput,
	RuiComboboxListbox,
	RuiComboboxTrigger,
	RuiComboboxValue,
	RuiListbox,
} from '@ecopages/radiant-ui/combobox';
import { RuiTagGroup } from '@ecopages/radiant-ui/tag-group';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '../../lib/field-rules.js';
import { ChoiceHost, type ChoiceValue } from '../../lib/choice-host.js';
import { choiceControlOptions, choiceKeys, serializeChoiceValue } from '../../lib/choice-value.js';
import { registerHostControl } from '../../lib/control-host.js';
import { FieldGroup } from '../field-group.js';
import type { ComboboxFieldProps } from './form-combobox.types.js';

/** The selector of the control's own ARIA target: where the field paints its label, description and state. */
const ARIA_TARGET = '[data-combobox-input]';

/**
 * @remarks
 * `value` is the option's own value, or a list of them with `multiple`, while `rui-combobox` holds the text of
 * the chosen options' values as a list. The text typed to filter the options is not the value and leaves the
 * host untouched.
 */
@customElement('se-combobox', {
	hostAttributes: { 'data-rui-control': '', 'data-rui-aria-target': ARIA_TARGET },
})
export class SeCombobox extends ChoiceHost<string[]> {
	declare readonly [JSX_PROPS]?: Partial<
		Pick<SeCombobox, 'name' | 'disabled' | 'value' | 'options' | 'multiple' | 'placeholder'>
	>;

	/** The field's context, painted onto the `ARIA_TARGET` by `fieldAriaBindings` (see `ControlHost`). */
	@contextSelector({ context: fieldContext })
	@state
	@bindTo(fieldAriaBindings(ARIA_TARGET))
	protected field?: FieldContextValue = undefined;

	@prop({ type: Boolean, defaultValue: false }) multiple = false;
	@prop({ type: String }) placeholder = '';

	protected get controlTag(): string {
		return 'rui-combobox';
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
			<RuiCombobox
				placeholder={this.placeholder}
				disabled={this.disabled}
				selectionMode={selectionMode}
				value={this.toControl(this.value)}
			>
				<RuiComboboxControl>
					{this.multiple ? (
						<RuiComboboxValue>
							<RuiTagGroup embedded />
						</RuiComboboxValue>
					) : null}
					<RuiComboboxInput placeholder={this.placeholder} disabled={this.disabled} />
					<RuiComboboxClear disabled={this.disabled} />
					<RuiComboboxTrigger disabled={this.disabled} />
				</RuiComboboxControl>
				<RuiComboboxListbox>
					<RuiAutocomplete>
						<RuiAutocompleteCollection>
							<RuiListbox
								embedded
								selectionMode={selectionMode}
								options={choiceControlOptions(this.options)}
							/>
							<RuiAutocompleteEmpty>No results found.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiComboboxListbox>
			</RuiCombobox>
		);
	}
}

registerHostControl('se-combobox', { mode: 'wraps' });

export function FormCombobox(config: ComboboxFieldProps) {
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
			<SeCombobox
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
