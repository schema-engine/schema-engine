import { Input } from '@/components/ui/input';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useFormField, fieldText } from '@schema-engine/forms-react/hooks';
import type { InputFieldProps } from './form-input.types';

export function FormInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputFieldProps) {
	const { defaultValue, error, fieldProps, required, containerStyles } = useFormField(config);

	const { inputType, autoComplete, autoFocus, inputMode, spellCheck, placeholder } = config;

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
			<Input
				data-se-control
				{...fieldProps}
				type={inputType}
				defaultValue={fieldText(defaultValue)}
				onChange={(event) => {
					fieldProps.onChange(event);
					propsOnChange?.(event.target.value);
				}}
				onBlur={() => {
					fieldProps.onBlur();
					propsOnBlur?.();
				}}
				onFocus={propsOnFocus}
				placeholder={placeholder}
				autoComplete={autoComplete}
				autoFocus={autoFocus}
				inputMode={inputMode}
				spellCheck={spellCheck}
			/>
		</FieldGroup>
	);
}
