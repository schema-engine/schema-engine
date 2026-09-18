import {
	RuiNumberField,
	RuiNumberFieldDecrementButton,
	RuiNumberFieldGroup,
	RuiNumberFieldIncrementButton,
	RuiNumberFieldInput,
	RuiNumberFieldSteppers,
} from '@ecopages/radiant-ui/number-field';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { toFieldRules } from '@/lib/field-rules';
import type { NumberFieldProps } from '@/registry/forms/inputs/form-number.types';

export function FormNumber({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: NumberFieldProps) {
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
			rules={toFieldRules(config.rules)}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiNumberField
				name={config.name}
				minValue={config.min}
				maxValue={config.max}
				step={config.step}
				disabled={config.disabled}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value: number }>).detail;
					propsOnChange?.(detail?.value ?? '');
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			>
				<RuiNumberFieldGroup>
					<RuiNumberFieldInput placeholder={config.placeholder} />
					<RuiNumberFieldSteppers>
						<RuiNumberFieldDecrementButton />
						<RuiNumberFieldIncrementButton />
					</RuiNumberFieldSteppers>
				</RuiNumberFieldGroup>
			</RuiNumberField>
		</FieldGroup>
	);
}
