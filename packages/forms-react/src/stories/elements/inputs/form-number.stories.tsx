import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets, rhfAdapter } from '@/stories/shared/form-builder.ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
		adapter: rhfAdapter,
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
		adapter: { table: { disable: true } },
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
		config: createForm()
			.setId('number-default')
			.setTitle('Number Field')
			.addStep({ id: 'step-1', title: 'Enter Amount' })
			.addElement('number', {
				id: 'quantity',
				name: 'quantity',
				label: 'Quantity',
				placeholder: 'Enter quantity',
			})
			.build(),
	},
};

export const WithMinMax: Story = {
	args: {
		config: createForm()
			.setId('number-min-max')
			.setTitle('Age Input')
			.addStep({ id: 'step-1', title: 'Enter Your Age' })
			.addElement('number', {
				id: 'age',
				name: 'age',
				label: 'Age',
				placeholder: 'Enter your age',
				min: 18,
				max: 120,
				description: 'Must be between 18 and 120',
			})
			.build(),
	},
};

export const WithStep: Story = {
	args: {
		config: createForm()
			.setId('number-step')
			.setTitle('Price Input')
			.addStep({ id: 'step-1', title: 'Set Price' })
			.addElement('number', {
				id: 'price',
				name: 'price',
				label: 'Price',
				placeholder: '0.00',
				min: 0,
				step: 0.01,
				description: 'Enter price in dollars',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('number-validation')
			.setTitle('Number with Validation')
			.addStep({ id: 'step-1', title: 'Product Quantity' })
			.addElement('number', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Add to Cart', name: 'submit' })
			.build(),
	},
};

export const MultipleNumbers: Story = {
	args: {
		config: createForm()
			.setId('number-multiple')
			.setTitle('Order Form')
			.setDescription('Enter order details')
			.addStep({ id: 'step-1', title: 'Order Information' })
			.addElement('number', {
				id: 'quantity',
				name: 'quantity',
				label: 'Quantity',
				placeholder: 'Enter quantity',
				min: 1,
				rules: [ValidationPresets.number.required(), ValidationPresets.number.min(1)],
			})
			.addElement('number', {
				id: 'price',
				name: 'price',
				label: 'Unit Price',
				placeholder: '0.00',
				min: 0,
				step: 0.01,
				rules: [ValidationPresets.number.required(), ValidationPresets.number.min(0)],
			})
			.addElement('number', {
				id: 'discount',
				name: 'discount',
				label: 'Discount Percentage',
				placeholder: '0',
				min: 0,
				max: 100,
				description: 'Enter discount percentage (0-100)',
			})
			.addElement('submit', { id: 'submit', label: 'Calculate Total', name: 'submit' })
			.build(),
	},
};

export const RangeInput: Story = {
	args: {
		config: createForm()
			.setId('number-range')
			.setTitle('Budget Range')
			.setDescription('Set your budget limits')
			.addStep({ id: 'step-1', title: 'Budget Configuration' })
			.addElement('number', {
				id: 'minBudget',
				name: 'minBudget',
				label: 'Minimum Budget',
				placeholder: '0',
				min: 0,
				step: 100,
				rules: [ValidationPresets.number.required('Minimum budget is required')],
			})
			.addElement('number', {
				id: 'maxBudget',
				name: 'maxBudget',
				label: 'Maximum Budget',
				placeholder: '0',
				min: 0,
				step: 100,
				rules: [ValidationPresets.number.required('Maximum budget is required')],
			})
			.addElement('submit', { id: 'submit', label: 'Set Budget', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('number-disabled')
			.setTitle('Disabled Number States')
			.setDescription('Examples of disabled number inputs')
			.addStep({ id: 'step-1', title: 'Statistics' })
			.addElement('number', {
				id: 'disabledEmpty',
				name: 'disabledEmpty',
				label: 'Disabled empty number',
				placeholder: 'Cannot edit',
				disabled: true,
			})
			.addElement('number', {
				id: 'disabledWithValue',
				name: 'disabledWithValue',
				label: 'Disabled with value',
				description: 'This value is fixed',
				disabled: true,
				defaultValue: 42,
			})
			.addElement('number', {
				id: 'calculatedTotal',
				name: 'calculatedTotal',
				label: 'Calculated Total',
				description: 'Auto-calculated field',
				disabled: true,
				defaultValue: 1250.5,
				step: 0.01,
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('number-mixed')
			.setTitle('Mixed Number States')
			.setDescription('Combination of enabled and disabled number inputs')
			.addStep({ id: 'step-1', title: 'Invoice Details' })
			.addElement('number', {
				id: 'invoiceNumber',
				name: 'invoiceNumber',
				label: 'Invoice Number',
				description: 'Auto-generated',
				disabled: true,
				defaultValue: 10034,
			})
			.addElement('number', {
				id: 'quantity',
				name: 'quantity',
				label: 'Quantity',
				placeholder: 'Enter quantity',
				min: 1,
				rules: [ValidationPresets.number.required(), ValidationPresets.number.min(1)],
			})
			.addElement('number', {
				id: 'unitPrice',
				name: 'unitPrice',
				label: 'Unit Price',
				placeholder: '0.00',
				min: 0,
				step: 0.01,
				rules: [ValidationPresets.number.required()],
			})
			.addElement('number', {
				id: 'taxRate',
				name: 'taxRate',
				label: 'Tax Rate',
				description: 'Fixed by region',
				disabled: true,
				defaultValue: 8.5,
				step: 0.1,
			})
			.addElement('submit', { id: 'submit', label: 'Create Invoice', name: 'submit' })
			.build(),
	},
};
