import {
	RuiNumberField,
	RuiNumberFieldDecrementButton,
	RuiNumberFieldGroup,
	RuiNumberFieldIncrementButton,
	RuiNumberFieldInput,
	RuiNumberFieldSteppers,
} from '@ecopages/radiant-ui/number-field';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import type { NumberFieldProps } from './form-number.types';

export function FormNumber(config: NumberFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			validation={config}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiNumberField
				name={config.name}
				minValue={config.min}
				maxValue={config.max}
				step={config.step}
				disabled={config.disabled}
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
