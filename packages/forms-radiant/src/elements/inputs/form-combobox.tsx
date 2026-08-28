import '@ecopages/radiant-ui/combobox/styles.css';
import { RuiCombobox } from '@ecopages/radiant-ui/combobox';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { toFieldRules } from '@/lib/field-rules';
import type { ComboboxFieldProps } from '@/registry/forms/inputs/form-combobox.types';

export function FormCombobox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: ComboboxFieldProps) {
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled,
	}));

	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
			description={config.description}
			style={{ ...getFieldGridStyles(config.grid), ...config.style }}
			rules={toFieldRules(config.rules)}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiCombobox
				placeholder={config.placeholder}
				disabled={config.disabled}
				options={options}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					const value = detail?.value ?? '';
					propsOnChange?.(config.multiple ? (value === '' ? [] : [value]) : value);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
