import { DatePicker } from '@/components/ui/schema-engine/components/date-picker';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useFormField, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import type { DateFieldProps } from './form-date.types';

export function FormDate({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: DateFieldProps) {
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
			<DatePicker
				{...fieldProps}
				id={config.id}
				value={typeof value === 'string' ? value : ''}
				placeholder={config.placeholder}
				dateFormat={config.dateFormat}
				min={config.min}
				max={config.max}
				onChange={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				autoFocus={config.autoFocus}
				aria-invalid={error ? true : undefined}
			/>
		</FieldGroup>
	);
}
