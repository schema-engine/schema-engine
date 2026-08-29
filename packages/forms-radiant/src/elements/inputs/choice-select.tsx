import '@ecopages/radiant-ui/autocomplete/styles.css';
import { RuiAutocomplete, RuiAutocompleteCollection } from '@ecopages/radiant-ui/autocomplete';
import '@ecopages/radiant-ui/listbox/styles.css';
import '@ecopages/radiant-ui/select/styles.css';
import {
	RuiListbox,
	RuiSelect,
	RuiSelectClear,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import '@ecopages/radiant-ui/tag-group/styles.css';
import { RuiTagGroup } from '@ecopages/radiant-ui/tag-group';

export type ChoiceOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

export function ChoiceSelect({
	placeholder,
	disabled,
	multiple,
	searchable,
	options,
	onChange,
	onBlur,
	onFocus,
}: {
	placeholder?: string;
	disabled?: boolean;
	multiple?: boolean;
	searchable?: boolean;
	options: ChoiceOption[];
	onChange?: (event: Event) => void;
	onBlur?: () => void;
	onFocus?: () => void;
}) {
	const listbox = <RuiListbox embedded selectionMode={multiple ? 'multiple' : 'single'} options={options} />;

	return (
		<RuiSelect
			placeholder={placeholder}
			disabled={disabled}
			selectionMode={multiple ? 'multiple' : 'single'}
			on:change={onChange}
			on:blur={onBlur}
			on:focus={onFocus}
		>
			<RuiSelectControl>
				<RuiSelectTrigger disabled={disabled}>
					<RuiSelectValue>{multiple ? <RuiTagGroup embedded /> : null}</RuiSelectValue>
				</RuiSelectTrigger>
				<RuiSelectClear disabled={disabled} />
				<RuiSelectToggle disabled={disabled} />
			</RuiSelectControl>
			<RuiSelectListbox>
				{searchable ? (
					<RuiAutocomplete>
						<RuiSelectSearch placeholder={placeholder ?? 'Search'} disabled={disabled} />
						<RuiAutocompleteCollection>{listbox}</RuiAutocompleteCollection>
					</RuiAutocomplete>
				) : (
					listbox
				)}
			</RuiSelectListbox>
		</RuiSelect>
	);
}
