import { FormField } from '@/elements/form-field';
import '@ecopages/radiant-ui/checkbox-group';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { toFieldRules } from '@/lib/field-rules';
import type { CheckboxFieldProps } from '@/registry/forms/inputs/form-checkbox.types';

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxFieldProps) {
	return (
		<FormField
			name={config.name}
			rules={toFieldRules(config)}
			defaultValueData={config.defaultValue !== undefined ? JSON.stringify(config.defaultValue) : undefined}
			disabled={config.disabled}
			grid={config.grid}
			style={config.style}
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
		</FormField>
	);
}
