import { FormField } from '@/elements/form-field';
import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { bindField } from '@/lib/bind-field';
import type { RadioFieldProps } from './form-radio.types';

export function FormRadio({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: RadioFieldProps) {
	const { hostProps, controlProps, isRequired } = bindField(config);
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled || config.disabled,
	}));

	return (
		<FormField {...hostProps}>
			{config.label ? (
				<RuiLabel>
					{config.label}
					{isRequired ? ' *' : ''}
				</RuiLabel>
			) : null}
			<RuiRadioGroup
				{...controlProps}
				options={options}
				value={config.defaultValue}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(detail?.value ?? '');
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</FormField>
	);
}
