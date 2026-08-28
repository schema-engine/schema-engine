import { Input } from '@/components/ui/input';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { InputFieldProps } from './form-input.types';

export function FormInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const { inputType = 'text', ...rest } = config;

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
				type={inputType}
				value={value || ''}
				onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				{...rest}
			/>
		</FieldGroup>
	);
}
