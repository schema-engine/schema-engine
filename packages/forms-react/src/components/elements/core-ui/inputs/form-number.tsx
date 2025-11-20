import { Input } from '@/components/core-ui/input';
import { FieldGroup } from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { NumberFieldProps } from './form-number.types';

export function FormNumber({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: NumberFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

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
			<Input
				{...fieldProps}
				type="number"
				value={value || ''}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
					const numValue = e.target.value ? Number(e.target.value) : '';
					combineHandlers(onChange, propsOnChange)(numValue);
				}}
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
