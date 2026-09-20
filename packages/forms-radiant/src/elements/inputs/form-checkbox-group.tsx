import { RuiCheckboxGroup } from '@ecopages/radiant-ui/checkbox-group';
import { FieldGroup } from '../field-group';
import { parseChoiceValue, serializeChoiceValue } from '@/lib/choice-value';
import { bindField } from '@/lib/bind-field';
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
	const { fieldGroupProps, controlProps } = bindField(config, {
		orientation: config.orientation,
		options,
		value: config.defaultValue,
	});

	return (
		<FieldGroup {...fieldGroupProps} defaultValue={serializeChoiceValue(config.defaultValue)}>
			<RuiCheckboxGroup
				{...controlProps}
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
