import { FormMaskedInput } from './form-masked-input';
import { MaskedInputFieldSchema } from './form-masked-input.types';
import { defineInput } from '@schema-engine/forms';

export const MaskedInputElementRegistration = defineInput({
	$type: 'masked-input',
	appearanceAxes: ['size'],
	render: FormMaskedInput,
	schema: MaskedInputFieldSchema,
	metadata: {
		name: 'Masked Input',
		description: 'Text input with an IMask pattern',
		category: 'input',
	},
});
