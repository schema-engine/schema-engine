import { FieldGroup } from '@/components/elements/field-group';
import { useAdapterControlledFormElement } from '@/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/core-ui/select';
import type { SelectFieldProps } from './form-select.types';

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles, combineHandlers } =
		useAdapterControlledFormElement(config);

	const isMultiple = config.multiple;

	const normalizedValue = isMultiple ? (Array.isArray(value) ? value : []) : (value ?? '');

	const values = isMultiple ? (normalizedValue as string[]) : normalizedValue ? [normalizedValue] : [];

	const selectedLabels = values
		.map((v) => config.options.find((opt) => String(opt.value) === String(v))?.label)
		.filter(Boolean);

	const displayLabel = selectedLabels.length
		? isMultiple
			? `${selectedLabels[0]}${selectedLabels.length > 1 ? ` (+${selectedLabels.length - 1} more)` : ''}`
			: selectedLabels[0]
		: null;

	const selectedOptions = values.map((v) => ({
		value: String(v),
		label: config.options.find((opt) => String(opt.value) === String(v))?.label || String(v),
	}));

	const handleValueChange = (val: unknown) => {
		if (isMultiple) {
			const newValues = Array.isArray(val) ? val.map(String) : [String(val)];
			combineHandlers(onChange, propsOnChange)(newValues);
		} else {
			combineHandlers(onChange, propsOnChange)(String(val));
		}
	};

	const handleRemoveValue = (valueToRemove: string) => {
		const newValues = values.filter((v) => String(v) !== valueToRemove);
		handleValueChange(newValues);
	};

	const selectValue = isMultiple ? values.map(String) : normalizedValue ? String(normalizedValue) : '';

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
			<Select
				multiple={isMultiple}
				value={selectValue}
				onValueChange={handleValueChange}
				disabled={fieldProps.disabled}
			>
				<SelectTrigger {...fieldProps} onBlur={combineHandlers(onBlur, propsOnBlur)} onFocus={propsOnFocus}>
					<SelectValue onRemoveValue={handleRemoveValue} options={selectedOptions} multiple={isMultiple}>
						{!isMultiple && displayLabel}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{config.options.map((option) => (
						<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldGroup>
	);
}
