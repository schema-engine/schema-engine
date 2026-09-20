import {
	RuiNumberField,
	RuiNumberFieldDecrementButton,
	RuiNumberFieldGroup,
	RuiNumberFieldIncrementButton,
	RuiNumberFieldInput,
	RuiNumberFieldSteppers,
} from '@ecopages/radiant-ui/number-field';
import { FieldGroup } from '../field-group';
import { bindField } from '@/lib/bind-field';
import type { NumberFieldProps } from './form-number.types';

export function FormNumber({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: NumberFieldProps) {
	const { fieldGroupProps, controlProps } = bindField(config, {
		minValue: config.min,
		maxValue: config.max,
		step: config.step,
	});

	return (
		<FieldGroup {...fieldGroupProps}>
			<RuiNumberField
				{...controlProps}
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
