import { defaultFormFieldRegistry } from '@/lib/form-engine/schemas/registry';
import { InputFieldSchema, inputFieldExample } from './form-input.types';
import { FormInput } from './form-input';

/**
 * Register input field component with enhanced type system
 * Tree-shakable: Only imported when needed
 */
defaultFormFieldRegistry.register({
	componentId: 'input',
	component: FormInput,
	runtimeSchema: InputFieldSchema,
	serializableSchema: InputFieldSchema,
	metadata: {
		title: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
		example: inputFieldExample,
	},
});
