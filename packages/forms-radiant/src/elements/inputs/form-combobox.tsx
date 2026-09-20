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
import { FieldGroup } from '../field-group';
import { parseChoiceValue, serializeChoiceValue } from '@/lib/choice-value';
import { bindField } from '@/lib/bind-field';
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
	const { fieldGroupProps, controlProps } = bindField(config, {
		placeholder: config.placeholder,
		selectionMode: (isMultiple ? 'multiple' : 'single') as 'multiple' | 'single',
		value: config.defaultValue,
	});

	return (
		<FieldGroup {...fieldGroupProps} defaultValue={serializeChoiceValue(config.defaultValue)}>
			<RuiCombobox
				{...controlProps}
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
