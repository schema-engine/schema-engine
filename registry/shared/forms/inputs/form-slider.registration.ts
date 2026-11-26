import { FormSlider } from './form-slider';
import { SliderElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const SliderElementRegistration = defineInput({
	...SliderElementContract,
	render: FormSlider,
});
