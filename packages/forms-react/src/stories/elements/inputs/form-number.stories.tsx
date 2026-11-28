import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { defineStoryForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui.js';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Number input element for numeric values with support for min/max constraints, step increments, and validation rules. Base UI implementation.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={baseUIEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with number element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-default',
			title: 'Number Field',
			steps: [
				{
					id: 'step-1',
					title: 'Enter Amount',
					elements: [
						{
							$type: 'number',
							id: 'quantity',
							name: 'quantity',
							label: 'Quantity',
							placeholder: 'Enter quantity',
						},
					],
				},
			],
		}),
	},
};

export const WithMinMax: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-min-max',
			title: 'Age Input',
			steps: [
				{
					id: 'step-1',
					title: 'Enter Your Age',
					elements: [
						{
							$type: 'number',
							id: 'age',
							name: 'age',
							label: 'Age',
							placeholder: 'Enter your age',
							min: 18,
							max: 120,
							description: 'Must be between 18 and 120',
						},
					],
				},
			],
		}),
	},
};

export const WithStep: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-step',
			title: 'Price Input',
			steps: [
				{
					id: 'step-1',
					title: 'Set Price',
					elements: [
						{
							$type: 'number',
							id: 'price',
							name: 'price',
							label: 'Price',
							placeholder: '0.00',
							min: 0,
							step: 0.01,
							description: 'Enter price in dollars',
						},
					],
				},
			],
		}),
	},
};

export const WithValidation: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-validation',
			title: 'Number with Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Product Quantity',
					elements: [
						{
							$type: 'number',
							id: 'quantity',
							name: 'quantity',
							label: 'Quantity',
							placeholder: 'Enter quantity',
							min: 1,
							max: 100,
							description: 'Minimum 1, maximum 100',
							rules: [
								ValidationPresets.number.required('Quantity is required'),
								ValidationPresets.number.min(1, 'Minimum quantity is 1'),
								ValidationPresets.number.max(100, 'Maximum quantity is 100'),
							],
						},
						{ $type: 'submit', id: 'submit', label: 'Add to Cart', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleNumbers: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-multiple',
			title: 'Order Form',
			description: 'Enter order details',
			steps: [
				{
					id: 'step-1',
					title: 'Order Information',
					elements: [
						{
							$type: 'number',
							id: 'quantity',
							name: 'quantity',
							label: 'Quantity',
							placeholder: 'Enter quantity',
							min: 1,
							rules: [ValidationPresets.number.required(), ValidationPresets.number.min(1)],
						},
						{
							$type: 'number',
							id: 'price',
							name: 'price',
							label: 'Unit Price',
							placeholder: '0.00',
							min: 0,
							step: 0.01,
							rules: [ValidationPresets.number.required(), ValidationPresets.number.min(0)],
						},
						{
							$type: 'number',
							id: 'discount',
							name: 'discount',
							label: 'Discount Percentage',
							placeholder: '0',
							min: 0,
							max: 100,
							description: 'Enter discount percentage (0-100)',
						},
						{ $type: 'submit', id: 'submit', label: 'Calculate Total', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const RangeInput: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-range',
			title: 'Budget Range',
			description: 'Set your budget limits',
			steps: [
				{
					id: 'step-1',
					title: 'Budget Configuration',
					elements: [
						{
							$type: 'number',
							id: 'minBudget',
							name: 'minBudget',
							label: 'Minimum Budget',
							placeholder: '0',
							min: 0,
							step: 100,
							rules: [ValidationPresets.number.required('Minimum budget is required')],
						},
						{
							$type: 'number',
							id: 'maxBudget',
							name: 'maxBudget',
							label: 'Maximum Budget',
							placeholder: '0',
							min: 0,
							step: 100,
							rules: [ValidationPresets.number.required('Maximum budget is required')],
						},
						{ $type: 'submit', id: 'submit', label: 'Set Budget', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-disabled',
			title: 'Disabled Number States',
			description: 'Examples of disabled number inputs',
			steps: [
				{
					id: 'step-1',
					title: 'Statistics',
					elements: [
						{
							$type: 'number',
							id: 'disabledEmpty',
							name: 'disabledEmpty',
							label: 'Disabled empty number',
							placeholder: 'Cannot edit',
							disabled: true,
						},
						{
							$type: 'number',
							id: 'disabledWithValue',
							name: 'disabledWithValue',
							label: 'Disabled with value',
							description: 'This value is fixed',
							disabled: true,
							defaultValue: 42,
						},
						{
							$type: 'number',
							id: 'calculatedTotal',
							name: 'calculatedTotal',
							label: 'Calculated Total',
							description: 'Auto-calculated field',
							disabled: true,
							defaultValue: 1250.5,
							step: 0.01,
						},
					],
				},
			],
		}),
	},
};

export const MixedStates: Story = {
	args: {
		config: defineStoryForm({
			id: 'number-mixed',
			title: 'Mixed Number States',
			description: 'Combination of enabled and disabled number inputs',
			steps: [
				{
					id: 'step-1',
					title: 'Invoice Details',
					elements: [
						{
							$type: 'number',
							id: 'invoiceNumber',
							name: 'invoiceNumber',
							label: 'Invoice Number',
							description: 'Auto-generated',
							disabled: true,
							defaultValue: 10034,
						},
						{
							$type: 'number',
							id: 'quantity',
							name: 'quantity',
							label: 'Quantity',
							placeholder: 'Enter quantity',
							min: 1,
							rules: [ValidationPresets.number.required(), ValidationPresets.number.min(1)],
						},
						{
							$type: 'number',
							id: 'unitPrice',
							name: 'unitPrice',
							label: 'Unit Price',
							placeholder: '0.00',
							min: 0,
							step: 0.01,
							rules: [ValidationPresets.number.required()],
						},
						{
							$type: 'number',
							id: 'taxRate',
							name: 'taxRate',
							label: 'Tax Rate',
							description: 'Fixed by region',
							disabled: true,
							defaultValue: 8.5,
							step: 0.1,
						},
						{ $type: 'submit', id: 'submit', label: 'Create Invoice', name: 'submit' },
					],
				},
			],
		}),
	},
};
