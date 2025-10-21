import * as React from 'react';
import { FieldGroup } from '@/components/elements/field-group';
import { combineHandlers, useControlledFormElement } from '@/hooks';
import {
	Combobox,
	ComboboxClear,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxPositioner,
	ComboboxPortal,
	ComboboxEmpty,
	ComboboxTrigger,
	ComboboxValue,
	ComboboxChipsTrigger,
} from '@/components/base-ui/combobox';
import type { ComboboxFieldProps } from './form-combobox.types';

export function FormCombobox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: ComboboxFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const isMultiple = config.multiple;
	const values = isMultiple && Array.isArray(value) ? value : isMultiple ? [] : value ? [value] : [];

	const findItemByValue = (val: unknown): { value: string | number; label: string } | undefined => {
		if (!config.options || val === null || val === undefined) return undefined;
		return config.options.find((opt) => String(opt.value) === String(val));
	};

	const selectedValues = isMultiple
		? values
				.map((v) => findItemByValue(v))
				.filter((item): item is { value: string | number; label: string } => item !== undefined)
		: [];

	const selectedSingleValue = !isMultiple && value ? findItemByValue(value) : undefined;

	const selectedOptions = values.map((v) => ({
		value: String(v),
		label: config.options.find((opt) => String(opt.value) === String(v))?.label || String(v),
	}));

	const handleValueChange = (val: unknown) => {
		if (isMultiple) {
			const items = Array.isArray(val) ? val : [val];
			const newValues = items.map((item: any) => String(item?.value ?? item));
			combineHandlers(onChange, propsOnChange)(newValues);
		} else {
			const itemValue = (val as any)?.value ?? val;
			combineHandlers(onChange, propsOnChange)(String(itemValue));
		}
	};

	const handleRemoveValue = (valueToRemove: string) => {
		const newValues = values.filter((v) => String(v) !== valueToRemove);
		handleValueChange(newValues);
	};

	const handleBlur = () => {
		onBlur?.();
		propsOnBlur?.();
	};

	const containerRef = React.useRef<HTMLDivElement | null>(null);

	const comboboxValue = isMultiple ? selectedValues : selectedSingleValue || { value: '', label: '' };

	const hasValue = isMultiple ? selectedValues.length > 0 : Boolean(selectedSingleValue);

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
				value={comboboxValue}
				onValueChange={handleValueChange}
				items={config.options}
				itemToStringValue={(item: any) => String(item?.value ?? '')}
				itemToStringLabel={(item: any) => String(item?.label ?? '')}
			>
				{isMultiple ? (
					<ComboboxChipsTrigger ref={containerRef} onBlur={handleBlur} onFocus={propsOnFocus}>
						<ComboboxValue
							chipData={selectedOptions}
							multiple
							onRemoveChip={handleRemoveValue}
							placeholder={config.placeholder}
						/>
					</ComboboxChipsTrigger>
				) : (
					<div
						className="relative flex flex-col gap-1 text-sm leading-5 font-medium text-gray-900"
						ref={containerRef}
					>
						<ComboboxInput
							placeholder={config.placeholder || 'Select an option...'}
							onBlur={handleBlur}
							onFocus={propsOnFocus}
						/>
						<div className="absolute right-2 bottom-0 flex h-9 items-center justify-center text-gray-600">
							{hasValue ? <ComboboxClear aria-label="Clear selection" /> : null}
							<ComboboxTrigger aria-label="Open popup" />
						</div>
					</div>
				)}

				<ComboboxPortal>
					<ComboboxPositioner sideOffset={4} anchor={containerRef}>
						<ComboboxPopup>
							<ComboboxEmpty>No options found.</ComboboxEmpty>
							<ComboboxList>
								{(item: (typeof config.options)[number]) => (
									<ComboboxItem key={item.value} value={item}>
										{item.label}
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxPopup>
					</ComboboxPositioner>
				</ComboboxPortal>
			</Combobox>
		</FieldGroup>
	);
}
