import { defineInput } from '@schema-engine/forms';
import { SliderElementContract } from '@schema-engine/forms/default-elements';
import { FormSlider } from './form-slider.js';

export const SliderElementRegistration = defineInput({
	...SliderElementContract,
	render: FormSlider,
});
