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
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import { serializeChoiceValue } from '@/lib/choice-value';
import type { SelectFieldProps } from './form-select.types';

export function FormSelect(config: SelectFieldProps) {
	const isMultiple = Boolean(config.multiple);
	const selectionMode = isMultiple ? 'multiple' : 'single';
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled,
	}));
	const listbox = <RuiListbox embedded selectionMode={selectionMode} options={options} />;

	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			validation={config}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<RuiSelect
				placeholder={config.placeholder}
				disabled={config.disabled}
				selectionMode={selectionMode}
				{...(config.defaultValue === undefined ? {} : { value: config.defaultValue })}
			>
				<RuiSelectControl>
					<RuiSelectTrigger disabled={config.disabled}>
						<RuiSelectValue>{isMultiple ? <RuiTagGroup embedded /> : null}</RuiSelectValue>
					</RuiSelectTrigger>
					<RuiSelectClear disabled={config.disabled} />
					<RuiSelectToggle disabled={config.disabled} />
				</RuiSelectControl>
				<RuiSelectListbox>{listbox}</RuiSelectListbox>
			</RuiSelect>
		</FieldGroup>
	);
}
