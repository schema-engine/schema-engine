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
					'Masked text input powered by imask. Use for formatted values such as IBAN, card numbers, and dates.',
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
			description: 'Form configuration with masked-input element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BankAccount: Story = {
	args: {
		config: createForm()
			.setId('masked-input-iban')
			.setTitle('Bank transfer')
			.addStep({ id: 'step-1', title: 'Account details' })
			.addElement('masked-input', {
				id: 'iban',
				name: 'iban',
				label: 'Bank account (IBAN)',
				mask: 'aa00 0000 0000 000000',
				placeholder: 'ES12 4311 2144 214423',
				description: 'Enter the international bank account number',
				inputMode: 'text',
				autoComplete: 'off',
			})
			.build(),
	},
};

export const CardNumber: Story = {
	args: {
		config: createForm()
			.setId('masked-input-card')
			.setTitle('Card number')
			.addStep({ id: 'step-1', title: 'Payment' })
			.addElement('masked-input', {
				id: 'cardNumber',
				name: 'cardNumber',
				label: 'Card number',
				mask: '0000 0000 0000 0000',
				placeholder: '4242 4242 4242 4242',
				inputMode: 'numeric',
				autoComplete: 'cc-number',
			})
			.build(),
	},
};

export const ExpiryDate: Story = {
	args: {
		config: createForm()
			.setId('masked-input-expiry')
			.setTitle('Expiry date')
			.addStep({ id: 'step-1', title: 'Payment' })
			.addElement('masked-input', {
				id: 'expiry',
				name: 'expiry',
				label: 'Expiry date',
				mask: '00/00',
				placeholder: 'MM/YY',
				inputMode: 'numeric',
				autoComplete: 'cc-exp',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('masked-input-validation')
			.setTitle('Bank account with validation')
			.addStep({ id: 'step-1', title: 'Payout details' })
			.addElement('masked-input', {
				id: 'iban',
				name: 'iban',
				label: 'Bank account (IBAN)',
				mask: 'aa00 0000 0000 000000',
				placeholder: 'ES12 4311 2144 214423',
				description: 'Required for payouts',
				rules: [
					ValidationPresets.string.required('IBAN is required'),
					ValidationPresets.string.minLength(15, 'Enter a complete IBAN'),
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save account', name: 'submit' })
			.build(),
	},
};

export const PaymentDetails: Story = {
	args: {
		config: createForm()
			.setId('masked-input-payment')
			.setTitle('Payment details')
			.setDescription('Card details are formatted as you type')
			.addStep({ id: 'step-1', title: 'Card' })
			.addElement('input', {
				id: 'cardholder',
				name: 'cardholder',
				label: 'Cardholder name',
				placeholder: 'Jane Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.required('Name is required')],
			})
			.addElement('masked-input', {
				id: 'cardNumber',
				name: 'cardNumber',
				label: 'Card number',
				mask: '0000 0000 0000 0000',
				placeholder: '4242 4242 4242 4242',
				inputMode: 'numeric',
				autoComplete: 'cc-number',
				rules: [
					ValidationPresets.string.required('Card number is required'),
					ValidationPresets.string.minLength(19, 'Enter a complete card number'),
				],
			})
			.addElement('masked-input', {
				id: 'expiry',
				name: 'expiry',
				label: 'Expiry date',
				mask: '00/00',
				placeholder: 'MM/YY',
				inputMode: 'numeric',
				autoComplete: 'cc-exp',
				rules: [ValidationPresets.string.required('Expiry date is required')],
			})
			.addElement('masked-input', {
				id: 'cvc',
				name: 'cvc',
				label: 'CVC',
				mask: '000',
				placeholder: '123',
				inputMode: 'numeric',
				autoComplete: 'cc-csc',
				rules: [ValidationPresets.string.required('CVC is required')],
			})
			.addElement('submit', { id: 'submit', label: 'Pay now', name: 'submit' })
			.build(),
	},
};
