import { RuiCheckboxGroup } from '@ecopages/radiant-ui/checkbox-group';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { parseChoiceValue, serializeChoiceValue } from '@/lib/choice-value';
import { toFieldRules } from '@/lib/field-rules';
import type { CheckboxGroupFieldProps } from './form-checkbox-group.types';

export function FormCheckboxGroup({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxGroupFieldProps) {
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
			grid={config.grid}
			style={config.style}
			rules={toFieldRules(config)}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<RuiCheckboxGroup
				name={config.name}
				orientation={config.orientation}
				disabled={config.disabled}
				options={options}
				value={config.defaultValue}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(parseChoiceValue(detail?.value ?? '', true) as string[]);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
