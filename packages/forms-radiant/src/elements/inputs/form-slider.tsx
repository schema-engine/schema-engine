import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { toFieldRules } from '@/lib/field-rules';
import type { SliderFieldProps } from './form-slider.types';

export function FormSlider({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SliderFieldProps) {
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
