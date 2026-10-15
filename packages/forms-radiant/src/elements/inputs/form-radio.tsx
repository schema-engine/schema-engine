import { FormField } from '@/elements/form-field';
import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { toFieldRules } from '@/lib/field-rules';
import type { RadioFieldProps } from './form-radio.types';

export function FormRadio({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: RadioFieldProps) {
	const isRequired = isFieldRequired(config.rules);
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled || config.disabled,
	}));

	return (
		<FormField
			name={config.name}
			rules={toFieldRules(config)}
			validationRules={config.rules}
			defaultValueData={config.defaultValue !== undefined ? JSON.stringify(config.defaultValue) : undefined}
			disabled={config.disabled}
			grid={config.grid}
			style={config.style}
		>
			{config.label ? (
				<RuiLabel>
					{config.label}
					{isRequired ? ' *' : ''}
				</RuiLabel>
			) : null}
			<RuiRadioGroup
				name={config.name}
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
