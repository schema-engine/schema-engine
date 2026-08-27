import { FieldGroup } from '@/components/schema-engine/forms/field-group';
import { combineHandlers, useControlledFormElement } from '@schema-engine/forms-react/hooks';
import {
	Combobox,
	ComboboxChips,
	ComboboxChip,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	useComboboxAnchor,
} from '@/components/ui/schema-engine/components/combobox';
import type { ComboboxFieldProps, ComboboxOption } from './form-combobox.types';

function optionValue(item: ComboboxOption | string | number | null | undefined) {
	if (item == null) return '';
	if (typeof item === 'object') return String(item.value);
	return String(item);
}

export function FormCombobox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: ComboboxFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);
	const isMultiple = Boolean(config.multiple);
	const values = isMultiple ? (Array.isArray(value) ? value : []) : value == null || value === '' ? [] : [value];
	const selected = values
		.map((item) => config.options.find((option) => String(option.value) === String(item)))
		.filter((item): item is ComboboxOption => item !== undefined);
	const anchor = useComboboxAnchor();

	const handleValueChange = (nextValue: ComboboxOption | ComboboxOption[] | null) => {
		if (isMultiple) {
			const items = Array.isArray(nextValue) ? nextValue : nextValue ? [nextValue] : [];
			combineHandlers(onChange, propsOnChange)(items.map((item) => optionValue(item)));
			return;
		}
		combineHandlers(onChange, propsOnChange)(optionValue(Array.isArray(nextValue) ? nextValue[0] : nextValue));
	};

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<Combobox
				{...fieldProps}
				multiple={isMultiple}
				value={isMultiple ? selected : (selected[0] ?? null)}
				onValueChange={handleValueChange}
				items={config.options}
				itemToStringValue={(item: ComboboxOption) => String(item.value)}
				itemToStringLabel={(item: ComboboxOption) => item.label}
			>
				{isMultiple ? (
					<div ref={anchor}>
						<ComboboxChips>
							{selected.map((item) => (
								<ComboboxChip key={String(item.value)}>{item.label}</ComboboxChip>
							))}
							<ComboboxChipsInput
								placeholder={config.placeholder}
								onBlur={combineHandlers(onBlur, propsOnBlur)}
								onFocus={propsOnFocus}
							/>
						</ComboboxChips>
					</div>
				) : (
					<ComboboxInput
						placeholder={config.placeholder || 'Select an option...'}
						onBlur={combineHandlers(onBlur, propsOnBlur)}
						onFocus={propsOnFocus}
					/>
				)}
				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>No options found.</ComboboxEmpty>
					<ComboboxList>
						{(item: ComboboxOption) => (
							<ComboboxItem key={String(item.value)} value={item}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</FieldGroup>
	);
}
