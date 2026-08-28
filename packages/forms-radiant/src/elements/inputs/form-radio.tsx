import '@ecopages/radiant-ui/radio-group/styles.css';
import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import '@ecopages/radiant-ui/field/styles.css';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import '@ecopages/radiant-ui/label/styles.css';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { toFieldRules } from '@/lib/field-rules';
import type { RadioFieldProps } from '@/registry/forms/inputs/form-radio.types';

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
		<RuiField
			name={config.name}
			rules={toFieldRules(config.rules)}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
			style={{ ...getFieldGridStyles(config.grid), ...config.style }}
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
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(detail?.value ?? '');
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</RuiField>
	);
}
