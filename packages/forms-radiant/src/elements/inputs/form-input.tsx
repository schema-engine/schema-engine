import { RuiInput } from '@ecopages/radiant-ui/input';
import { FieldGroup } from '../field-group';
import { bindField } from '@/lib/bind-field';
import type { InputFieldProps } from './form-input.types';

export function FormInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputFieldProps) {
	const { fieldGroupProps, controlProps } = bindField(config, {
		type: config.inputType,
		placeholder: config.placeholder,
	});

	return (
		<FieldGroup {...fieldGroupProps}>
			<RuiInput
				{...controlProps}
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
