import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { toFieldRules } from '@/lib/field-rules';
import type { SwitchFieldProps } from '@/registry/forms/inputs/form-switch.types';

export function FormSwitch({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SwitchFieldProps) {
	return (
		<RuiField
			name={config.name}
			rules={toFieldRules(config.rules)}
			defaultValueData={config.defaultValue !== undefined ? JSON.stringify(config.defaultValue) : undefined}
			disabled={config.disabled}
			style={{ ...getFieldGridStyles(config.grid), ...config.style }}
		>
			<RuiSwitch
				id={config.id}
				name={config.name}
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
