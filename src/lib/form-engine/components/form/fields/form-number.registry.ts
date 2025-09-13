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
defaultFormFieldRegistry.register({
	componentId: 'number',
	component: FormNumber,
	runtimeSchema: NumberFieldConfigSchema,
	serializableSchema: NumberFieldConfigSchema,
	metadata: {
		title: 'Number',
		description: 'Numeric input with validation',
		category: 'input',
		example: numberFieldExample,
	},
});
