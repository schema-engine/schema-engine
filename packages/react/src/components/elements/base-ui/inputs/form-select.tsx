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

	const renderDisplayValue = () => {
		if (!selectedLabels.length) return null;

		if (isMultiple) {
			const firstLabel = selectedLabels[0];
			const additionalCount = selectedLabels.length > 1 ? ` (+${selectedLabels.length - 1} more)` : '';
			return firstLabel + additionalCount;
		}

		return selectedLabels[0];
	};

	const handleValueChange = (val: unknown) => {
		const strVal = String(val);

		if (isMultiple) {
			const currentValues = Array.isArray(value) ? [...value] : [];
			const index = currentValues.findIndex((v) => String(v) === strVal);

			if (index > -1) {
				currentValues.splice(index, 1);
			} else {
				currentValues.push(strVal);
			}

			combineHandlers(onChange, propsOnChange)(currentValues);
		} else {
			combineHandlers(onChange, propsOnChange)(strVal);
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
				value={isMultiple ? (values.length > 0 ? values[values.length - 1] : '') : value ? String(value) : ''}
				onValueChange={handleValueChange}
				disabled={fieldProps.disabled}
				multiple={isMultiple}
			>
				<SelectTrigger {...fieldProps} onBlur={combineHandlers(onBlur, propsOnBlur)} onFocus={propsOnFocus}>
					<SelectValue>{renderDisplayValue()}</SelectValue>
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
