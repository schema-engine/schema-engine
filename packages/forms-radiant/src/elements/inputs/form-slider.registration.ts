import { SliderElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormSlider } from './form-slider.js';

export const SliderElementRegistration = {
	...SliderElementContract,
	render: FormSlider,
} satisfies ElementBinding<typeof SliderElementContract>;
