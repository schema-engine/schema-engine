/**
 * Compile-time checks for ArrayElementsConfig and nested FormEngine.ElementConfig unions.
 * Run via: bun run check-types (tsconfig.test-types.json)
 */

import type { ArrayElementsConfig } from '@/components/schema-engine/forms/inputs/form-array-elements.types';

import '@/components/schema-engine/forms/inputs/form-input.registration';
import '@/components/schema-engine/forms/inputs/form-select.registration';
import '@/components/schema-engine/forms/inputs/form-textarea.registration';
import '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import '@/components/schema-engine/forms/inputs/form-number.registration';
import '@/components/schema-engine/forms/inputs/form-array-elements.registration';

type Assert<T extends true> = T;

const arrayConfig = {
	$type: 'arrayElements',
	id: 'testArray',
	name: 'testArray',
	label: 'Test Array',
	elements: [
		{
			$type: 'input',
			id: 'name',
			name: 'name',
			label: 'Name',
			inputType: 'text',
		},
		{
			$type: 'select',
			id: 'category',
			name: 'category',
			label: 'Category',
			options: [
				{ value: 'a', label: 'Option A' },
				{ value: 'b', label: 'Option B' },
			],
		},
	],
} satisfies ArrayElementsConfig;

const discriminatedElements = [
	{
		$type: 'input',
		id: 'text',
		name: 'text',
		inputType: 'email',
	},
	{
		$type: 'select',
		id: 'dropdown',
		name: 'dropdown',
		options: [
			{ value: 'a', label: 'Option A' },
			{ value: 'b', label: 'Option B' },
		],
	},
	{
		$type: 'arrayElements',
		id: 'nestedArray',
		name: 'nestedArray',
		elements: [
			{
				$type: 'input',
				id: 'nestedInput',
				name: 'nestedInput',
				inputType: 'text',
			},
		],
	},
] satisfies ArrayElementsConfig['elements'];

function assertInputElement(element: Extract<FormEngine.ElementConfig, { $type: 'input' }>) {
	const _inputType: string = element.inputType;
	void _inputType;
}

function assertSelectElement(element: Extract<FormEngine.ElementConfig, { $type: 'select' }>) {
	const _options: typeof element.options = element.options;
	void _options;
}

for (const element of discriminatedElements) {
	if (element.$type === 'input') {
		assertInputElement(element);
	} else if (element.$type === 'select') {
		assertSelectElement(element);
	} else if (element.$type === 'arrayElements') {
		const _nested: FormEngine.ElementConfig[] = element.elements;
		void _nested;
	}
}

const fieldConfigs = [
	{
		$type: 'input',
		id: 'email',
		name: 'email',
		inputType: 'email',
		autoComplete: 'email',
		spellCheck: false,
	},
	{
		$type: 'textarea',
		id: 'description',
		name: 'description',
		rows: 4,
		resize: 'vertical',
	},
	{
		$type: 'checkbox',
		id: 'agree',
		name: 'agree',
	},
] satisfies ArrayElementsConfig['elements'];

for (const element of fieldConfigs) {
	switch (element.$type) {
		case 'input': {
			const _autoComplete: string | undefined = element.autoComplete;
			void _autoComplete;
			break;
		}
		case 'textarea': {
			const _rows: number | undefined = element.rows;
			void _rows;
			break;
		}
		case 'checkbox': {
			type _isCheckbox = Assert<typeof element.$type extends 'checkbox' ? true : false>;
			break;
		}
	}
}

const complexArray = {
	$type: 'arrayElements',
	id: 'products',
	name: 'products',
	label: 'Products',
	description: 'Add your products',
	elements: [
		{
			$type: 'input',
			id: 'productName',
			name: 'name',
			label: 'Product Name',
			inputType: 'text',
			placeholder: 'Enter product name...',
		},
		{
			$type: 'select',
			id: 'category',
			name: 'category',
			label: 'Category',
			options: [
				{ value: 'electronics', label: 'Electronics' },
				{ value: 'clothing', label: 'Clothing' },
				{ value: 'books', label: 'Books' },
			],
		},
		{
			$type: 'number',
			id: 'price',
			name: 'price',
			label: 'Price',
			min: 0,
			step: 0.01,
		},
	],
	minItems: 1,
	maxItems: 50,
	addButtonText: 'Add Product',
	removeButtonText: 'Remove Product',
} satisfies ArrayElementsConfig;

type _complexArrayElementTypes = Assert<

		| (typeof complexArray.elements)[0]['$type']
		| (typeof complexArray.elements)[1]['$type']
		| (typeof complexArray.elements)[2]['$type'] extends 'input' | 'select' | 'number'
		? true
		: false
>;

const _invalidElement = {
	// @ts-expect-error -- unknown element $type is not in the ElementRegistry union
	$type: 'not-a-registered-element',
	id: 'x',
	name: 'x',
} satisfies FormEngine.ElementConfig;

const _invalidInput = {
	$type: 'input',
	id: 'x',
	name: 'x',
	// @ts-expect-error -- input elements require inputType
} satisfies FormEngine.ElementConfig;

void arrayConfig;
void discriminatedElements;
void fieldConfigs;
void complexArray;
void _invalidElement;
void _invalidInput;
