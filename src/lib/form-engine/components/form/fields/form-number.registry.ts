import { defaultFormFieldRegistry } from '@/lib/form-engine/schemas/registry';
import { NumberFieldConfigSchema } from './form-number.types';
import { FormNumber } from './form-number';

const numberFieldExample = {
	componentId: 'number' as const,
	id: 'number-field',
	name: 'numberField',
	label: 'Enter a number',
	placeholder: '0',
	min: 0,
	step: 1,
};

/**
 * Register number field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
export const numberFieldRegistration: FormEngine.FieldRegistration = {
	componentId: 'number',
	component: FormNumber,
	schema: NumberFieldConfigSchema,
	metadata: {
		title: 'Number',
		description: 'Numeric input with validation',
		category: 'input',
		example: numberFieldExample,
	},
};

defaultFormFieldRegistry.register(numberFieldRegistration);
