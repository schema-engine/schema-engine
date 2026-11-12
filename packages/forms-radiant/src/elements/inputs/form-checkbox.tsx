import { FormField } from '@/elements/form-field';
import '@ecopages/radiant-ui/checkbox-group';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import type { CheckboxFieldProps } from './form-checkbox.types';

export function FormCheckbox(config: CheckboxFieldProps) {
	return (
		<FormField
			name={config.name}
			validation={config}
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
			>
				{config.label}
			</RuiCheckbox>
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</FormField>
	);
}
