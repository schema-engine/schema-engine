import { FormSlider } from './form-slider';
import { SliderFieldConfigSchema, sliderFieldValue } from './form-slider.types';
import { defineInput } from '@schema-engine/forms';

export const SliderElementRegistration = defineInput({
	$type: 'slider',
	appearanceAxes: ['size'],
	render: FormSlider,
	schema: SliderFieldConfigSchema,
	value: sliderFieldValue,
	metadata: {
		name: 'Slider Field',
		description: 'Slider input field for selecting a numeric value within a range',
		category: 'input',
	},
});
