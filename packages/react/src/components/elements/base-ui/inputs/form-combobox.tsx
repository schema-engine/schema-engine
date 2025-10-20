import * as React from 'react';
import { FieldGroup } from '@/components/elements/field-group';
import { useAdapterControlledFormElement, combineHandlers } from '@/hooks';
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
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } = useAdapterControlledFormElement(
		config as any,
	);

	const isMultiple = config.multiple;
	const values = isMultiple && Array.isArray(value) ? value : isMultiple ? [] : value ? [value] : [];

	const chipData = values.map((v) => ({
		value: String(v),
		label: config.options.find((opt) => String(opt.value) === String(v))?.label || String(v),
	}));

	const handleValueChange = (val: unknown) => {
		combineHandlers(onChange, propsOnChange)(val as string | string[]);
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
				value={isMultiple ? values : value}
				onValueChange={handleValueChange}
				options={config.options}
			>
				{isMultiple ? (
					<ComboboxChipsTrigger ref={containerRef} onBlur={handleBlur} onFocus={propsOnFocus}>
						<ComboboxValue
							chipData={chipData}
							multiple
							showInput
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
						<div className="absolute right-2 bottom-0 flex h-10 items-center justify-center text-gray-600">
							<ComboboxClear aria-label="Clear selection" />
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
