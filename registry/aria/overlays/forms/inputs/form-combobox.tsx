import type * as React from 'react';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { combineHandlers, useFormField } from '@schema-engine/forms-react/hooks';
import {
	Combobox,
	ComboboxChips,
	ComboboxChip,
	ComboboxChipList,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	useComboboxAnchor,
} from '@/components/ui/schema-engine/components/combobox';
import type { ComboboxFieldProps, ComboboxOption } from '@/components/schema-engine/forms/inputs/form-combobox.types';

export function FormCombobox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: ComboboxFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(config, {
		controlled: true,
	});
	const isMultiple = Boolean(config.multiple);
	const values = isMultiple ? (Array.isArray(value) ? value : []) : value == null || value === '' ? [] : [value];
	const selectedKeys = values.map(String);
	const anchor = useComboboxAnchor();

	const handleSelectionChange = (key: React.Key | null) => {
		if (key == null) {
			combineHandlers(onChange, propsOnChange)(isMultiple ? [] : '');
			return;
		}
		combineHandlers(onChange, propsOnChange)(isMultiple ? [String(key)] : String(key));
	};

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={required}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<Combobox
				{...fieldProps}
				selectionMode={isMultiple ? 'multiple' : 'single'}
				selectedKey={selectedKeys[0] ?? null}
				onSelectionChange={handleSelectionChange}
				isDisabled={fieldProps.disabled}
				allowsEmptyCollection
				items={config.options}
			>
				{isMultiple ? (
					<div ref={anchor}>
						<ComboboxChips>
							<ComboboxChipList<ComboboxOption>>
								{(item) => <ComboboxChip id={String(item.value)}>{item.label}</ComboboxChip>}
							</ComboboxChipList>
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
					<ComboboxList items={config.options}>
						{(item: ComboboxOption) => (
							<ComboboxItem key={String(item.value)} id={String(item.value)} textValue={item.label}>
								{item.label}
							</ComboboxItem>
						)}
					</ComboboxList>
					<ComboboxEmpty>No options found.</ComboboxEmpty>
				</ComboboxContent>
			</Combobox>
		</FieldGroup>
	);
}
