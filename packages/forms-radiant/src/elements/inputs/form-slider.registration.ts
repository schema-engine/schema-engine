import { FormSlider } from './form-slider';
import type { SliderFieldConfig, SliderFieldProps } from '@/registry/forms/inputs/form-slider.types';
import { SliderFieldConfigSchema } from '@/registry/forms/inputs/form-slider.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			slider: SliderFieldConfig;
		}
	}
}

export const SliderElementRegistration: InputRegistration<'slider', SliderFieldConfig, SliderFieldProps> = {
	$type: 'slider',
	render: FormSlider,
	schema: asStandardSchema(SliderFieldConfigSchema),
	metadata: {
		name: 'Slider Field',
		description: 'Slider input field for selecting a numeric value within a range',
		category: 'input',
	},
};
