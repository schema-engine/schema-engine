import '@ecopages/radiant-ui/checkbox-group';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { toFieldRules } from '@/lib/field-rules';
import type { CheckboxFieldProps } from '@/registry/forms/inputs/form-checkbox.types';

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxFieldProps) {
	return (
		<RuiField
			name={config.name}
			rules={toFieldRules(config.rules)}
			defaultValueData={config.defaultValue !== undefined ? JSON.stringify(config.defaultValue) : undefined}
			disabled={config.disabled}
			style={{ ...getFieldGridStyles(config.grid), ...config.style }}
		>
			<RuiCheckbox
				id={config.id}
				name={config.name}
				indeterminate={config.indeterminate}
				disabled={config.disabled}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ checked: boolean }>).detail;
					propsOnChange?.(detail?.checked ?? false);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			>
				{config.label}
			</RuiCheckbox>
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</RuiField>
	);
}
