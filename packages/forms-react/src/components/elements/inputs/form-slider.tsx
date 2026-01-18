import { FieldGroup } from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import { Slider } from '@/components/core-ui/slider';
import type { SliderFieldProps } from './form-slider.types';

export function FormSlider({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SliderFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const sliderValue = typeof value === 'number' ? [value] : [config.min || 0];

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<div className="flex items-center gap-4">
				<Slider
					id={config.id}
					min={config.min || 0}
					max={config.max || 100}
					step={config.step || 1}
					value={sliderValue}
					onValueChange={(values: number | readonly number[]) => {
						const val = Array.isArray(values) ? values[0] : values;
						combineHandlers(onChange, propsOnChange)(val);
					}}
					disabled={fieldProps.disabled}
					orientation={config.orientation}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					autoFocus={config.autoFocus}
					className="flex-1"
				/>
				<span className="text-sm font-medium text-gray-700 min-w-12">{sliderValue[0]}</span>
			</div>
		</FieldGroup>
	);
}
