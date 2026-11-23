import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useFormField, combineHandlers } from '@schema-engine/forms-react/hooks';
import { Slider } from '@/components/ui/slider';
import type { SliderFieldProps } from '@/components/schema-engine/forms/inputs/form-slider.types';

export function FormSlider({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SliderFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(config, {
		controlled: true,
	});

	const sliderValue = typeof value === 'number' ? value : config.min || 0;

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={required}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<div className="flex items-center gap-4">
				<Slider
					id={config.id}
					minValue={config.min || 0}
					maxValue={config.max || 100}
					step={config.step || 1}
					value={sliderValue}
					onChange={(val: number) => combineHandlers(onChange, propsOnChange)(val)}
					isDisabled={fieldProps.disabled}
					orientation={config.orientation}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					autoFocus={config.autoFocus}
					className="flex-1"
				/>
				<span className="text-sm font-medium text-gray-700 min-w-12">{sliderValue}</span>
			</div>
		</FieldGroup>
	);
}
