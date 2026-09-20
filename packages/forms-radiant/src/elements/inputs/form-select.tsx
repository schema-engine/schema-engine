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
import { FieldGroup } from '../field-group';
import { parseChoiceValue, serializeChoiceValue } from '@/lib/choice-value';
import { bindField } from '@/lib/bind-field';
import type { SelectFieldProps } from './form-select.types';

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
	const isMultiple = Boolean(config.multiple);
	const selectionMode = isMultiple ? 'multiple' : 'single';
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled,
	}));
	const listbox = <RuiListbox embedded selectionMode={selectionMode} options={options} />;
	const { fieldGroupProps, controlProps } = bindField(config, {
		placeholder: config.placeholder,
		selectionMode: selectionMode as 'multiple' | 'single',
	});

	return (
		<FieldGroup {...fieldGroupProps} defaultValue={serializeChoiceValue(config.defaultValue)}>
			<RuiSelect
				{...controlProps}
				{...(config.defaultValue === undefined ? {} : { value: config.defaultValue })}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(parseChoiceValue(detail?.value ?? '', isMultiple));
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
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
