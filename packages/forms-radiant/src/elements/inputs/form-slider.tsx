import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import type { SliderFieldProps } from './form-slider.types';

export function FormSlider(config: SliderFieldProps) {
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
			<RuiSlider
				name={config.name}
				min={config.min ?? 0}
				max={config.max ?? 100}
				step={config.step ?? 1}
				orientation={config.orientation}
				disabled={config.disabled}
				showValue
				value={config.defaultValue}
			/>
		</FieldGroup>
	);
}
