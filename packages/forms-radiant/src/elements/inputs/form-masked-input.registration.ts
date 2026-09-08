import { FormMaskedInput } from './form-masked-input';
import type { MaskedInputFieldConfig } from '@/registry/forms/inputs/form-masked-input.types';
import { MaskedInputFieldSchema } from '@/registry/forms/inputs/form-masked-input.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'masked-input': MaskedInputFieldConfig;
		}
	}
}

export const MaskedInputElementRegistration = defineInput({
	$type: 'masked-input',
	render: FormMaskedInput,
	schema: MaskedInputFieldSchema,
	metadata: {
		name: 'Masked Input',
		description: 'Text input with an IMask pattern',
		category: 'input',
	},
});
