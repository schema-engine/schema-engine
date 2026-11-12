import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import type { RadioFieldProps } from './form-radio.types';

export function FormRadio(config: RadioFieldProps) {
	const options = config.options.map((option) => ({
		value: String(option.value),
		label: option.label,
		disabled: option.disabled || config.disabled,
	}));

	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			validation={config}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiRadioGroup name={config.name} options={options} value={config.defaultValue} />
		</FieldGroup>
	);
}
