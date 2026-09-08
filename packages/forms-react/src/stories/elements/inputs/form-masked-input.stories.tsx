import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { defineStoryForm, getEngine, ValidationPresets, rhfAdapter } from '@/stories/shared/form-builder.ui';

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
		config: defineStoryForm({
			id: 'masked-input-iban',
			title: 'Bank transfer',
			steps: [
				{
					id: 'step-1',
					title: 'Account details',
					elements: [
						{
							$type: 'masked-input',
							id: 'iban',
							name: 'iban',
							label: 'Bank account (IBAN)',
							mask: 'aa00 0000 0000 000000',
							placeholder: 'ES12 4311 2144 214423',
							description: 'Enter the international bank account number',
							inputMode: 'text',
							autoComplete: 'off',
						},
					],
				},
			],
		}),
	},
};

export const CardNumber: Story = {
	args: {
		config: defineStoryForm({
			id: 'masked-input-card',
			title: 'Card number',
			steps: [
				{
					id: 'step-1',
					title: 'Payment',
					elements: [
						{
							$type: 'masked-input',
							id: 'cardNumber',
							name: 'cardNumber',
							label: 'Card number',
							mask: '0000 0000 0000 0000',
							placeholder: '4242 4242 4242 4242',
							inputMode: 'numeric',
							autoComplete: 'cc-number',
						},
					],
				},
			],
		}),
	},
};

export const ExpiryDate: Story = {
	args: {
		config: defineStoryForm({
			id: 'masked-input-expiry',
			title: 'Expiry date',
			steps: [
				{
					id: 'step-1',
					title: 'Payment',
					elements: [
						{
							$type: 'masked-input',
							id: 'expiry',
							name: 'expiry',
							label: 'Expiry date',
							mask: '00/00',
							placeholder: 'MM/YY',
							inputMode: 'numeric',
							autoComplete: 'cc-exp',
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
			id: 'masked-input-validation',
			title: 'Bank account with validation',
			steps: [
				{
					id: 'step-1',
					title: 'Payout details',
					elements: [
						{
							$type: 'masked-input',
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
						},
						{ $type: 'submit', id: 'submit', label: 'Save account', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const PaymentDetails: Story = {
	args: {
		config: defineStoryForm({
			id: 'masked-input-payment',
			title: 'Payment details',
			description: 'Card details are formatted as you type',
			steps: [
				{
					id: 'step-1',
					title: 'Card',
					elements: [
						{
							$type: 'input',
							id: 'cardholder',
							name: 'cardholder',
							label: 'Cardholder name',
							placeholder: 'Jane Doe',
							inputType: 'text',
							rules: [ValidationPresets.string.required('Name is required')],
						},
						{
							$type: 'masked-input',
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
						},
						{
							$type: 'masked-input',
							id: 'expiry',
							name: 'expiry',
							label: 'Expiry date',
							mask: '00/00',
							placeholder: 'MM/YY',
							inputMode: 'numeric',
							autoComplete: 'cc-exp',
							rules: [ValidationPresets.string.required('Expiry date is required')],
						},
						{
							$type: 'masked-input',
							id: 'cvc',
							name: 'cvc',
							label: 'CVC',
							mask: '000',
							placeholder: '123',
							inputMode: 'numeric',
							autoComplete: 'cc-csc',
							rules: [ValidationPresets.string.required('CVC is required')],
						},
						{ $type: 'submit', id: 'submit', label: 'Pay now', name: 'submit' },
					],
				},
			],
		}),
	},
};
