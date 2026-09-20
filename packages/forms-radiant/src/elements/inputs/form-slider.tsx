import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { FieldGroup } from '../field-group';
import { bindField } from '@/lib/bind-field';
import type { SliderFieldProps } from './form-slider.types';

export function FormSlider({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SliderFieldProps) {
	const { fieldGroupProps, controlProps } = bindField(config, {
		min: config.min ?? 0,
		max: config.max ?? 100,
		step: config.step ?? 1,
		orientation: config.orientation,
		showValue: true,
		value: config.defaultValue,
	});

	return (
		<FieldGroup {...fieldGroupProps}>
			<RuiSlider
				{...controlProps}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ value?: number }>).detail;
					propsOnChange?.(detail?.value ?? 0);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
