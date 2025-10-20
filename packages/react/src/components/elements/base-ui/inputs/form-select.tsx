import { FieldGroup } from '@/components/elements/field-group';
import { useAdapterControlledFormElement, combineHandlers } from '@/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/base-ui/select';
import type { SelectFieldProps } from './form-select.types';

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useAdapterControlledFormElement(config);

	const isMultiple = config.multiple;
	const values = isMultiple && Array.isArray(value) ? value : isMultiple ? [] : value ? [value] : [];

	const selectedLabels = values
		.map((v) => config.options.find((opt) => String(opt.value) === String(v))?.label)
		.filter(Boolean);

	const displayLabel = selectedLabels.length
		? isMultiple
			? `${selectedLabels[0]}${selectedLabels.length > 1 ? ` (+${selectedLabels.length - 1} more)` : ''}`
			: selectedLabels[0]
		: null;

	const handleValueChange = (val: unknown) => {
		if (isMultiple) {
			const newValues = Array.isArray(val) ? val.map(String) : [String(val)];
			combineHandlers(onChange, propsOnChange)(newValues);
		} else {
			combineHandlers(onChange, propsOnChange)(String(val));
		}
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
			<Select
				value={values}
				onValueChange={handleValueChange}
				disabled={fieldProps.disabled}
				multiple={isMultiple}
			>
				<SelectTrigger {...fieldProps} onBlur={combineHandlers(onBlur, propsOnBlur)} onFocus={propsOnFocus}>
					<SelectValue>{displayLabel}</SelectValue>
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
