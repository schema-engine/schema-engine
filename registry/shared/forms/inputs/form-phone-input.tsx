import { PhoneInput } from '@/components/ui/schema-engine/components/phone-input';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers, fieldText } from '@schema-engine/forms-react/hooks';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import type { PhoneInputFieldProps } from './form-phone-input.types';
import type { Country } from 'react-phone-number-input';

export function FormPhoneInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: PhoneInputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } = useControlledFormElement(
		config as unknown as ElementConfig,
	);

	const { defaultCountry, international, placeholder } = config;

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
				value={fieldText(value)}
				defaultCountry={defaultCountry as Country | undefined}
				international={international}
				onChange={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				placeholder={placeholder}
			/>
		</FieldGroup>
	);
}
