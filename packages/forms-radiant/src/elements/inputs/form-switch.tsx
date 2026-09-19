import { FormField } from '@/elements/form-field';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { toFieldRules } from '@/lib/field-rules';
import type { SwitchFieldProps } from '@/registry/forms/inputs/form-switch.types';

export function FormSwitch({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SwitchFieldProps) {
	return (
		<FormField
			name={config.name}
			rules={toFieldRules(config)}
			defaultValueData={config.defaultValue !== undefined ? JSON.stringify(config.defaultValue) : undefined}
			disabled={config.disabled}
			grid={config.grid}
			style={config.style}
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
		</FormField>
	);
}
