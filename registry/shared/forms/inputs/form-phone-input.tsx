import { PhoneInput } from '@/components/ui/schema-engine/components/phone-input';
import { FieldGroup } from '@/components/schema-engine/forms/field-group';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { PhoneInputFieldProps } from './form-phone-input.types';

export function FormPhoneInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: PhoneInputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } = useControlledFormElement(
		config as unknown as FormEngine.ElementConfig,
	);

	const { defaultCountry, international, ...rest } = config;

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
			<PhoneInput
				{...fieldProps}
				value={value || ''}
				defaultCountry={defaultCountry}
				international={international}
				onChange={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				{...rest}
			/>
		</FieldGroup>
	);
}
