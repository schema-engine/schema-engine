import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, ValidationPresets } from '@/stories/shared/form-builder.shadcn';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'FieldSet component groups related form fields into a nested object structure. Supports validation on nested fields, optional legend and description for semantic HTML, and can be nested for deeply nested objects.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
	tags: ['autodocs'],
	argTypes: {
		config: {
			control: 'object',
			description: 'Form configuration with fieldset elements',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic address field set with street, city, state, and postal code
 */
export const AddressFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-address')
			.setTitle('Billing Information')
			.setDescription('Enter your billing address')
			.addStep({ id: 'step-1', title: 'Address' })
			.addElement('fieldSet', {
				id: 'billingAddress',
				name: 'billingAddress',
				legend: 'Billing Address',
				description: 'Enter your billing address details',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'street',
						name: 'street',
						label: 'Street Address',
						placeholder: '123 Main St',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'city',
						name: 'city',
						label: 'City',
						placeholder: 'New York',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'state',
						name: 'state',
						label: 'State',
						placeholder: 'NY',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'postalCode',
						name: 'postalCode',
						label: 'Postal Code',
						placeholder: '10001',
						rules: [
							ValidationPresets.string.required(),
							ValidationPresets.string.pattern('/^\\d{5}$/', 'Must be 5 digits'),
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

/**
 * Credit card information with expiration date and CVV
 */
export const CreditCardFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-credit-card')
			.setTitle('Payment Details')
			.setDescription('Secure payment processing')
			.addStep({ id: 'step-1', title: 'Payment' })
			.addElement('fieldSet', {
				id: 'paymentInfo',
				name: 'paymentInfo',
				legend: 'Payment Information',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'cardNumber',
						name: 'cardNumber',
						label: 'Card Number',
						placeholder: '1234 5678 9012 3456',
						rules: [
							ValidationPresets.string.required(),
							ValidationPresets.string.pattern('/^d{16}$/', 'Must be 16 digits'),
						],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'cardholderName',
						name: 'cardholderName',
						label: 'Cardholder Name',
						placeholder: 'John Doe',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'expirationDate',
						name: 'expirationDate',
						label: 'Expiration Date',
						placeholder: 'MM/YY',
						rules: [
							ValidationPresets.string.required(),
							ValidationPresets.string.pattern('/^\\d{2}\\/\\d{2}$/', 'Must be MM/YY format'),
						],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'cvv',
						name: 'cvv',
						label: 'CVV',
						placeholder: '123',
						rules: [
							ValidationPresets.string.required(),
							ValidationPresets.string.pattern('/^\\d{3,4}$/', 'Must be 3 or 4 digits'),
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Process Payment', name: 'submit' })
			.build(),
	},
};

/**
 * Date range field set with start and end dates
 */
export const DateRangeFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-date-range')
			.setTitle('Travel Booking')
			.setDescription('Select your travel dates')
			.addStep({ id: 'step-1', title: 'Dates' })
			.addElement('fieldSet', {
				id: 'dateRange',
				name: 'dateRange',
				legend: 'Select Date Range',
				description: 'Choose your travel dates',
				elements: [
					{
						__id: 'input',
						inputType: 'date',
						id: 'startDate',
						name: 'startDate',
						label: 'Start Date',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'date',
						id: 'endDate',
						name: 'endDate',
						label: 'End Date',
						rules: [ValidationPresets.string.required()],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Search', name: 'submit' })
			.build(),
	},
};

/**
 * Social media links field set
 */
export const SocialLinksFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-social-links')
			.setTitle('Social Profiles')
			.setDescription('Connect your social media accounts')
			.addStep({ id: 'step-1', title: 'Social Media' })
			.addElement('fieldSet', {
				id: 'socialLinks',
				name: 'socialLinks',
				legend: 'Social Media Profiles',
				description: 'Add links to your social media profiles',
				elements: [
					{
						__id: 'input',
						inputType: 'url',
						id: 'twitter',
						name: 'twitter',
						label: 'Twitter',
						placeholder: 'https://twitter.com/username',
						rules: [ValidationPresets.string.url()],
					},
					{
						__id: 'input',
						inputType: 'url',
						id: 'github',
						name: 'github',
						label: 'GitHub',
						placeholder: 'https://github.com/username',
						rules: [ValidationPresets.string.url()],
					},
					{
						__id: 'input',
						inputType: 'url',
						id: 'linkedin',
						name: 'linkedin',
						label: 'LinkedIn',
						placeholder: 'https://linkedin.com/in/username',
						rules: [ValidationPresets.string.url()],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Links', name: 'submit' })
			.build(),
	},
};

/**
 * Multiple field sets for shipping and billing addresses
 */
export const MultipleFieldSets: Story = {
	args: {
		config: createForm()
			.setId('fieldset-multiple')
			.setTitle('Shipping Information')
			.setDescription('Enter shipping and billing addresses')
			.addStep({ id: 'step-1', title: 'Addresses' })
			.addElement('fieldSet', {
				id: 'shippingAddress',
				name: 'shippingAddress',
				legend: 'Shipping Address',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'shippingStreet',
						name: 'street',
						label: 'Street',
						placeholder: '123 Main St',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'shippingCity',
						name: 'city',
						label: 'City',
						placeholder: 'New York',
						rules: [ValidationPresets.string.required()],
					},
				],
			})
			.addElement('fieldSet', {
				id: 'billingAddress',
				name: 'billingAddress',
				legend: 'Billing Address',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'billingStreet',
						name: 'street',
						label: 'Street',
						placeholder: '456 Oak Ave',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'billingCity',
						name: 'city',
						label: 'City',
						placeholder: 'Los Angeles',
						rules: [ValidationPresets.string.required()],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Proceed to Payment', name: 'submit' })
			.build(),
	},
};

/**
 * Field set with mixed input types
 */
export const MixedInputTypes: Story = {
	args: {
		config: createForm()
			.setId('fieldset-mixed')
			.setTitle('User Profile')
			.setDescription('Complete your profile')
			.addStep({ id: 'step-1', title: 'Profile' })
			.addElement('fieldSet', {
				id: 'userProfile',
				name: 'userProfile',
				legend: 'User Profile',
				description: 'Complete your profile information',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'fullName',
						name: 'fullName',
						label: 'Full Name',
						placeholder: 'John Doe',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email',
						placeholder: 'john@example.com',
						rules: [ValidationPresets.string.required(), ValidationPresets.string.email()],
					},
					{
						__id: 'textarea',
						id: 'bio',
						name: 'bio',
						label: 'Bio',
						placeholder: 'Tell us about yourself',
						rows: 3,
					},
					{
						__id: 'checkbox',
						id: 'newsletter',
						name: 'newsletter',
						label: 'Subscribe to newsletter',
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Profile', name: 'submit' })
			.build(),
	},
};

/**
 * Nested field sets demonstration
 */
export const NestedFieldSets: Story = {
	args: {
		config: createForm()
			.setId('fieldset-nested')
			.setTitle('Company Registration')
			.setDescription('Register your company')
			.addStep({ id: 'step-1', title: 'Company Info' })
			.addElement('fieldSet', {
				id: 'company',
				name: 'company',
				legend: 'Company Information',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'companyName',
						name: 'name',
						label: 'Company Name',
						placeholder: 'Acme Corp',
						rules: [ValidationPresets.string.required()],
					},
					{
						__id: 'fieldSet',
						id: 'headquarters',
						name: 'headquarters',
						legend: 'Headquarters Address',
						elements: [
							{
								__id: 'input',
								inputType: 'text',
								id: 'hqStreet',
								name: 'street',
								label: 'Street',
								placeholder: '123 Business Blvd',
								rules: [ValidationPresets.string.required()],
							},
							{
								__id: 'input',
								inputType: 'text',
								id: 'hqCity',
								name: 'city',
								label: 'City',
								placeholder: 'San Francisco',
								rules: [ValidationPresets.string.required()],
							},
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Register Company', name: 'submit' })
			.build(),
	},
};
