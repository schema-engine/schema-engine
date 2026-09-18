/** @jsxImportSource react */
import { DateRangePicker } from '@/components/ui/schema-engine/components/date-range-picker';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { DateRangeFieldProps, DateRangeValue } from './form-date-range.types';

function normalizeDateRange(value: unknown): DateRangeValue {
	if (!value || typeof value !== 'object') {
		return {};
	}

	const range = value as DateRangeValue;
	return {
		from: typeof range.from === 'string' ? range.from : undefined,
		to: typeof range.to === 'string' ? range.to : undefined,
	};
}

export function FormDateRange({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: DateRangeFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles, gridThemeId } =
		useControlledFormElement(config as unknown as FormEngine.ElementConfig);

	return (
		<FieldGroup
			gridThemeId={gridThemeId}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
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
