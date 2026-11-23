import { RuiCheckboxGroup } from '@ecopages/radiant-ui/checkbox-group';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import { serializeChoiceValue } from '@/lib/choice-value';
import type { CheckboxGroupFieldProps } from './form-checkbox-group.types';

export function FormCheckboxGroup(config: CheckboxGroupFieldProps) {
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
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			authoredRequired={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			class={config.className}
			style={config.style}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<RuiCheckboxGroup
				name={config.name}
				orientation={config.orientation}
				disabled={config.disabled}
				options={options}
				value={config.defaultValue}
			/>
		</FieldGroup>
	);
}
