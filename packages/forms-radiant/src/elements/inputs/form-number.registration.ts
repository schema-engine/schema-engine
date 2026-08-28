import { FormNumber } from './form-number';
import type { NumberFieldConfig, NumberFieldProps } from '@/registry/forms/inputs/form-number.types';
import { NumberFieldConfigSchema } from '@/registry/forms/inputs/form-number.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			number: NumberFieldConfig;
		}
	}
}

export const NumberElementRegistration: InputRegistration<'number', NumberFieldConfig, NumberFieldProps> = {
	$type: 'number',
	render: FormNumber,
	schema: asStandardSchema(NumberFieldConfigSchema),
	metadata: {
		name: 'Number Field',
		description: 'Numeric input field with optional min, max, and step',
		category: 'input',
	},
};
