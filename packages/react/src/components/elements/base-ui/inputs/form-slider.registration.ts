import { FormSlider } from './form-slider';
import type { SliderFieldConfig, SliderFieldProps } from './form-slider.types';
import { SliderFieldConfigSchema } from './form-slider.types';
import type { ElementRegistration } from '@json-form-engine/core';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			slider: SliderFieldConfig;
		}
	}
}

export const SliderElementRegistration: ElementRegistration<SliderFieldConfig, SliderFieldProps> = {
	__id: 'slider',
	render: FormSlider,
	schema: SliderFieldConfigSchema,
	metadata: {
		name: 'Slider Field',
		description: 'Slider input field for selecting a numeric value within a range',
		category: 'input',
	},
};
