import { RuiInput } from '@ecopages/radiant-ui/input';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { toFieldRules } from '@/lib/field-rules';
import type { InputFieldProps } from './form-input.types';

export function FormInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputFieldProps) {
	const { inputType, placeholder } = config;

	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			rules={toFieldRules(config)}
			validationRules={config.rules}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiInput
				id={config.id}
				name={config.name}
				type={inputType}
				placeholder={placeholder}
				disabled={config.disabled}
				on:input={(event: Event) => {
					const target = event.target as HTMLInputElement;
					propsOnChange?.(target.value);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
