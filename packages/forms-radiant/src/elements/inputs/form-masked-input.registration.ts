import { FormMaskedInput } from './form-masked-input';
import type { MaskedInputFieldConfig, MaskedInputFieldProps } from '@/registry/forms/inputs/form-masked-input.types';
import { MaskedInputFieldSchema } from '@/registry/forms/inputs/form-masked-input.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'masked-input': MaskedInputFieldConfig;
		}
	}
}

export const MaskedInputElementRegistration: InputRegistration<
	'masked-input',
	MaskedInputFieldConfig,
	MaskedInputFieldProps
> = {
	$type: 'masked-input',
	render: FormMaskedInput,
	schema: asStandardSchema(MaskedInputFieldSchema),
	metadata: {
		name: 'Masked Input',
		description: 'Text input with an IMask pattern',
		category: 'input',
	},
};
