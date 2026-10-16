import { FormSlider } from './form-slider';
import { SliderFieldConfigSchema } from './form-slider.types';
import { defineInput } from '@schema-engine/forms';

export const SliderElementRegistration = defineInput({
	$type: 'slider',
	render: FormSlider,
	schema: SliderFieldConfigSchema,
	metadata: {
		name: 'Slider Field',
		description: 'Slider input field for selecting a numeric value within a range',
		category: 'input',
	},
});
