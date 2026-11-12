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
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import { serializeChoiceValue } from '@/lib/choice-value';
import type { ComboboxFieldProps } from './form-combobox.types';

export function FormCombobox(config: ComboboxFieldProps) {
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
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			style={config.style}
			validation={config}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<RuiCombobox
				placeholder={config.placeholder}
				disabled={config.disabled}
				selectionMode={isMultiple ? 'multiple' : 'single'}
				value={config.defaultValue}
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
