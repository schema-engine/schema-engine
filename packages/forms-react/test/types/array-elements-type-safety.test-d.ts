/**
 * Compile-time checks for nested array authoring and the global ElementRegistry.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { createReactFormEngine } from '@/registries/builder-registry';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SelectElementRegistration } from '@/components/schema-engine/forms/inputs/form-select.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { NumberElementRegistration } from '@/components/schema-engine/forms/inputs/form-number.registration';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';

type Assert<T extends true> = T;

const engine = createReactFormEngine({
	elements: [
		InputElementRegistration,
		SelectElementRegistration,
		TextareaElementRegistration,
		CheckboxElementRegistration,
		NumberElementRegistration,
		ArrayElementRegistration,
	],
});

engine.defineForm({
	id: 'array-authoring',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
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
						{
							// @ts-expect-error -- nested children use this engine's registrations
							$type: 'not-a-registered-element',
							id: 'x',
							name: 'x',
						},
					],
				},
			],
		},
	],
});

engine.defineForm({
	id: 'products',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'arrayElements',
					id: 'products',
					name: 'products',
					label: 'Products',
					elements: [
						{
							$type: 'input',
							id: 'productName',
							name: 'name',
							label: 'Product Name',
							inputType: 'text',
						},
						{
							$type: 'select',
							id: 'category',
							name: 'category',
							label: 'Category',
							options: [
								{ value: 'electronics', label: 'Electronics' },
								{ value: 'clothing', label: 'Clothing' },
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
				},
			],
		},
	],
});

function assertInputElement(element: Extract<FormEngine.ElementConfig, { $type: 'input' }>) {
	const _inputType: string = element.inputType;
	void _inputType;
}

function assertSelectElement(element: Extract<FormEngine.ElementConfig, { $type: 'select' }>) {
	const _options: typeof element.options = element.options;
	void _options;
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
] satisfies FormEngine.ElementConfig[];

for (const element of fieldConfigs) {
	switch (element.$type) {
		case 'input': {
			assertInputElement(element);
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

void engine;
void fieldConfigs;
void _invalidElement;
void _invalidInput;
void assertSelectElement;
