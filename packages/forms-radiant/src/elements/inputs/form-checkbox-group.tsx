import '@ecopages/radiant-ui/checkbox';
import '@ecopages/radiant-ui/checkbox/styles.css';
import '@ecopages/radiant-ui/checkbox-group/styles.css';
import { RuiCheckboxGroup } from '@ecopages/radiant-ui/checkbox-group';
import '@ecopages/radiant-ui/field/styles.css';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import '@ecopages/radiant-ui/label/styles.css';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { toFieldRules } from '@/lib/field-rules';
import type { CheckboxGroupFieldProps } from '@/registry/forms/inputs/form-checkbox-group.types';

function parseGroupValue(value: string): string[] {
	return value === '' ? [] : value.split(',');
}

export function FormCheckboxGroup({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxGroupFieldProps) {
	const isRequired = isFieldRequired(config.rules);
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled,
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
			<RuiCheckboxGroup
				name={config.name}
				label={config.label}
				orientation={config.orientation}
				disabled={config.disabled}
				options={options}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(parseGroupValue(detail?.value ?? ''));
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</RuiField>
	);
}
