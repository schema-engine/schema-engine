import '@ecopages/radiant-ui/checkbox/styles.css';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import '@ecopages/radiant-ui/field/styles.css';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import '@ecopages/radiant-ui/label/styles.css';
import { RuiLabel } from '@ecopages/radiant-ui/label';
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
			defaultValue={config.defaultValue}
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
			/>
			{config.label ? <RuiLabel htmlFor={config.id}>{config.label}</RuiLabel> : null}
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</RuiField>
	);
}
