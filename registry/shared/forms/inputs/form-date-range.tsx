import { DateRangePicker } from '@/components/ui/schema-engine/components/date-range-picker';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useFormField, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import type { DateRangeFieldProps, DateRangeValue } from './form-date-range.types';

function normalizeDateRange(value: unknown): DateRangeValue {
	if (!value || typeof value !== 'object') {
		return {};
	}

	return {
		from: 'from' in value && typeof value.from === 'string' ? value.from : undefined,
		to: 'to' in value && typeof value.to === 'string' ? value.to : undefined,
	};
}

export function FormDateRange({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: DateRangeFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(
		config as unknown as ElementConfig,
	);

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
			<DateRangePicker
				{...fieldProps}
				id={config.id}
				value={normalizeDateRange(value)}
				placeholder={config.placeholder}
				dateFormat={config.dateFormat}
				min={config.min}
				max={config.max}
				numberOfMonths={config.numberOfMonths}
				presets={config.presets}
				onChange={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				autoFocus={config.autoFocus}
				aria-invalid={error ? true : undefined}
			/>
		</FieldGroup>
	);
}
