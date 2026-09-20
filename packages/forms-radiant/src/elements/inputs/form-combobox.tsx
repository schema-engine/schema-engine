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
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { parseChoiceValue, serializeChoiceValue } from '@/lib/choice-value';
import { toFieldRules } from '@/lib/field-rules';
import type { ComboboxFieldProps } from './form-combobox.types';

export function FormCombobox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: ComboboxFieldProps) {
	const isMultiple = Boolean(config.multiple);
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled,
	}));

	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			rules={toFieldRules(config)}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<RuiCombobox
				placeholder={config.placeholder}
				disabled={config.disabled}
				selectionMode={isMultiple ? 'multiple' : 'single'}
				value={config.defaultValue}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(parseChoiceValue(detail?.value ?? '', isMultiple));
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			>
				<RuiComboboxControl>
					{isMultiple ? (
						<RuiComboboxValue>
							<RuiTagGroup embedded />
						</RuiComboboxValue>
					) : null}
					<RuiComboboxInput placeholder={config.placeholder} disabled={config.disabled} />
					<RuiComboboxClear disabled={config.disabled} />
					<RuiComboboxTrigger disabled={config.disabled} />
				</RuiComboboxControl>
				<RuiComboboxListbox>
					<RuiAutocomplete>
						<RuiAutocompleteCollection>
							<RuiListbox embedded selectionMode={isMultiple ? 'multiple' : 'single'} options={options} />
							<RuiAutocompleteEmpty>No results found.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiComboboxListbox>
			</RuiCombobox>
		</FieldGroup>
	);
}
