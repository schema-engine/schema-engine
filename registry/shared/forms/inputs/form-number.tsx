import { NumberField } from '@/components/ui/schema-engine/components/number-field';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useFormField, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { NumberFieldProps } from './form-number.types';

export function FormNumber({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: NumberFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(config, {
		controlled: true,
	});

	const numericValue = typeof value === 'number' ? value : '';

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
			<NumberField
				{...fieldProps}
				id={config.id}
				value={numericValue}
				onChange={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				placeholder={config.placeholder}
				min={config.min}
				max={config.max}
				step={config.step}
				autoComplete={config.autoComplete}
				autoFocus={config.autoFocus}
				inputMode={config.inputMode}
			/>
		</FieldGroup>
	);
}
