/**
 * COMPILE-TIME TYPE SAFETY DEMONSTRATION
 * 
 * This file shows how the new array elements system provides:
 * 1. ✅ Compile-time type checking (TypeScript catches errors)
 * 2. ✅ Runtime validation (Zod catches runtime errors) 
 * 3. ✅ No arbitrary properties allowed
 * 4. ✅ Configurable field type restrictions
 * 5. ✅ JSON Schema compatibility
 */

import type { 
	StrictArrayElementsConfig,
	TextOnlyArrayConfig,
	InputOnlyArrayConfig 
} from '@/lib/form-engine/components/form/fields/form-array-elements.compile-safe';

// ✅ EXAMPLE 1: Full-featured array with compile-time safety
const contactFormArray: StrictArrayElementsConfig = {
	componentId: 'arrayElements',
	id: 'contact-info',
	name: 'contactInfo',
	label: 'Contact Information',
	elements: [
		{
			componentId: 'input',
			id: 'email',
			name: 'email',
			label: 'Email Address',
			inputType: 'email', // ✅ TypeScript knows valid input types
		},
		{
			componentId: 'textarea',
			id: 'message',
			name: 'message',  
			label: 'Message',
			rows: 4, // ✅ TypeScript knows textarea properties
		},
		{
			componentId: 'select',
			id: 'priority',
			name: 'priority',
			label: 'Priority',
			options: [ // ✅ TypeScript enforces options structure
				{ value: 'low', label: 'Low' },
				{ value: 'high', label: 'High' },
			],
		},
	],
};

// ✅ EXAMPLE 2: Text-only array (restricted field types)
const textOnlyArray: TextOnlyArrayConfig = {
	componentId: 'arrayElements',
	id: 'text-fields',
	name: 'textFields',
	label: 'Text Fields Only',
	elements: [
		{
			componentId: 'input',
			id: 'title',
			name: 'title',
			label: 'Title',
			inputType: 'text',
		},
		{
			componentId: 'textarea',
			id: 'description',
			name: 'description',
			label: 'Description',
		},
		// ❌ This would cause a TypeScript error:
		// {
		// 	componentId: 'select',
		// 	id: 'category',
		// 	name: 'category',
		// 	label: 'Category',
		// 	options: [],
		// },
	],
};

// ✅ EXAMPLE 3: Input-only array (most restrictive)
const inputOnlyArray: InputOnlyArrayConfig = {
	componentId: 'arrayElements',
	id: 'input-list',
	name: 'inputList',
	label: 'Input List Only',
	elements: [
		{
			componentId: 'input',
			id: 'firstName',
			name: 'firstName',
			label: 'First Name',
			inputType: 'text',
		},
		{
			componentId: 'input',
			id: 'lastName',
			name: 'lastName',
			label: 'Last Name',
			inputType: 'text',
		},
		// ❌ This would cause a TypeScript error:
		// {
		// 	componentId: 'textarea',
		// 	id: 'bio',
		// 	name: 'bio',
		// 	label: 'Bio',
		// },
	],
};

// ❌ COMPILE-TIME ERRORS: These would all fail TypeScript compilation

// Invalid property on element
// const invalidPropertyConfig: StrictArrayElementsConfig = {
// 	componentId: 'arrayElements',
// 	id: 'invalid',
// 	name: 'invalid',
// 	elements: [
// 		{
// 			componentId: 'input',
// 			id: 'test',
// 			name: 'test',
// 			invalidProperty: 'this fails', // ❌ TypeScript error
// 		},
// 	],
// };

// Invalid componentId
// const invalidComponentId: StrictArrayElementsConfig = {
// 	componentId: 'wrongComponent', // ❌ TypeScript error
// 	id: 'test',
// 	name: 'test',
// 	elements: [],
// };

// Missing required properties  
// const missingRequiredProps: StrictArrayElementsConfig = {
// 	componentId: 'arrayElements',
// 	// id: 'missing', // ❌ TypeScript error
// 	name: 'test',
// 	elements: [],
// };

// Invalid input type
// const invalidInputType: StrictArrayElementsConfig = {
// 	componentId: 'arrayElements',
// 	id: 'test',
// 	name: 'test',
// 	elements: [
// 		{
// 			componentId: 'input',
// 			id: 'test',
// 			name: 'test',
// 			inputType: 'invalidType', // ❌ TypeScript error
// 		},
// 	],
// };

/**
 * USAGE IN COMPONENTS
 */

// Example configurations that would be used in React components
export function getContactFormConfig(): StrictArrayElementsConfig {
	// ✅ This config is compile-time validated
	return contactFormArray;
}

export function getTextOnlyFormConfig(): TextOnlyArrayConfig {
	// ✅ This config only allows text fields  
	return textOnlyArray;
}

// Demonstration that types are working
const configs = {
	contact: getContactFormConfig(),
	textOnly: getTextOnlyFormConfig(),
	inputOnly: inputOnlyArray,
};

console.log('All configs are type-safe:', Object.keys(configs));

/**
 * DEVELOPER BENEFITS:
 * 
 * 1. ✅ IntelliSense: IDE shows available properties and types
 * 2. ✅ Compile-time errors: Catches mistakes before runtime
 * 3. ✅ Type safety: No more any types or arbitrary properties
 * 4. ✅ Runtime validation: Still validates at runtime with Zod
 * 5. ✅ JSON Schema: Can generate JSON Schema for serialization
 * 6. ✅ Configurable: Different array variants for different use cases
 */

console.log('Compile-time type safety examples compiled successfully!');