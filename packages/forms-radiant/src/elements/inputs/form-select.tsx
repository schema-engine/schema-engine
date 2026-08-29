import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { ChoiceSelect } from './choice-select';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { parseChoiceValue, serializeChoiceValue } from '@/lib/choice-value';
import { toFieldRules } from '@/lib/field-rules';
import type { SelectFieldProps } from '@/registry/forms/inputs/form-select.types';

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
	const isMultiple = Boolean(config.multiple);
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
			style={{ ...getFieldGridStyles(config.grid), ...config.style }}
			rules={toFieldRules(config.rules)}
			defaultValue={serializeChoiceValue(config.defaultValue)}
			disabled={config.disabled}
		>
			<ChoiceSelect
				placeholder={config.placeholder}
				disabled={config.disabled}
				multiple={isMultiple}
				options={options}
				onChange={(event: Event) => {
					const detail = (event as CustomEvent<{ value: string }>).detail;
					propsOnChange?.(parseChoiceValue(detail?.value ?? '', isMultiple));
				}}
				onBlur={propsOnBlur}
				onFocus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
