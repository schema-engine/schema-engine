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
					'FieldSet component groups related form fields into a nested object structure. Supports validation on nested fields, optional legend and description for semantic HTML, and can be nested for deeply nested objects. Base UI implementation.',
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
						$type: 'input',
						inputType: 'text',
						id: 'street',
						name: 'street',
						label: 'Street Address',
						placeholder: '123 Main St',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'city',
						name: 'city',
						label: 'City',
						placeholder: 'New York',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'state',
						name: 'state',
						label: 'State',
						placeholder: 'NY',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'input',
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
						$type: 'masked-input',
						id: 'cardNumber',
						name: 'cardNumber',
						label: 'Card Number',
						mask: '0000 0000 0000 0000',
						placeholder: '4242 4242 4242 4242',
						inputMode: 'numeric',
						autoComplete: 'cc-number',
						rules: [
							ValidationPresets.string.required(),
							ValidationPresets.string.minLength(19, 'Enter a complete card number'),
						],
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'cardholderName',
						name: 'cardholderName',
						label: 'Cardholder Name',
						placeholder: 'John Doe',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'masked-input',
						id: 'expirationDate',
						name: 'expirationDate',
						label: 'Expiration Date',
						mask: '00/00',
						placeholder: 'MM/YY',
						inputMode: 'numeric',
						autoComplete: 'cc-exp',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'masked-input',
						id: 'cvv',
						name: 'cvv',
						label: 'CVV',
						mask: '000',
						placeholder: '123',
						inputMode: 'numeric',
						autoComplete: 'cc-csc',
						rules: [ValidationPresets.string.required()],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Process Payment', name: 'submit' })
			.build(),
	},
};

/**
 * Contact information fieldset with multiple contact methods
 */
export const ContactInformationFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-contact')
			.setTitle('Contact Information')
			.setDescription('Provide your contact details')
			.addStep({ id: 'step-1', title: 'Contact' })
			.addElement('fieldSet', {
				id: 'contactInfo',
				name: 'contactInfo',
				legend: 'How can we reach you?',
				description: 'Provide at least one contact method',
				elements: [
					{
						$type: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email Address',
						placeholder: 'john@example.com',
						rules: [
							ValidationPresets.string.required(),
							ValidationPresets.string.email('Please enter a valid email'),
						],
					},
					{
						$type: 'phone-input',
						id: 'phone',
						name: 'phone',
						label: 'Phone Number',
						placeholder: 'Enter phone number',
						defaultCountry: 'US',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'website',
						name: 'website',
						label: 'Website (Optional)',
						placeholder: 'https://example.com',
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

/**
 * Date range fieldset with start and end dates
 */
export const DateRangeFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-date-range')
			.setTitle('Employment Period')
			.setDescription('Specify your employment duration')
			.addStep({ id: 'step-1', title: 'Duration' })
			.addElement('fieldSet', {
				id: 'employmentPeriod',
				name: 'employmentPeriod',
				legend: 'Employment Duration',
				description: 'Enter start and end dates of employment',
				elements: [
					{
						$type: 'input',
						inputType: 'date',
						id: 'startDate',
						name: 'startDate',
						label: 'Start Date',
						rules: [ValidationPresets.string.required('Start date is required')],
					},
					{
						$type: 'input',
						inputType: 'date',
						id: 'endDate',
						name: 'endDate',
						label: 'End Date (or Present)',
						rules: [ValidationPresets.string.required('End date is required')],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save', name: 'submit' })
			.build(),
	},
};

/**
 * Personal information fieldset
 */
export const PersonalInfoFieldSet: Story = {
	args: {
		config: createForm()
			.setId('fieldset-personal')
			.setTitle('Personal Information')
			.setDescription('Basic personal information')
			.addStep({ id: 'step-1', title: 'Personal' })
			.addElement('fieldSet', {
				id: 'personalInfo',
				name: 'personalInfo',
				legend: 'Basic Information',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'firstName',
						name: 'firstName',
						label: 'First Name',
						placeholder: 'John',
						rules: [ValidationPresets.string.required('First name is required')],
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'lastName',
						name: 'lastName',
						label: 'Last Name',
						placeholder: 'Doe',
						rules: [ValidationPresets.string.required('Last name is required')],
					},
					{
						$type: 'input',
						inputType: 'date',
						id: 'dateOfBirth',
						name: 'dateOfBirth',
						label: 'Date of Birth',
						autoComplete: 'bday',
						rules: [ValidationPresets.string.required('Date of birth is required')],
					},
					{
						$type: 'select',
						id: 'gender',
						name: 'gender',
						label: 'Gender',
						placeholder: 'Select gender',
						options: [
							{ label: 'Male', value: 'male' },
							{ label: 'Female', value: 'female' },
							{ label: 'Other', value: 'other' },
							{ label: 'Prefer not to say', value: 'prefer_not' },
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save', name: 'submit' })
			.build(),
	},
};

/**
 * Nested fieldsets - Address with multiple address types
 */
export const NestedFieldSets: Story = {
	args: {
		config: createForm()
			.setId('fieldset-nested')
			.setTitle('Complete Profile')
			.setDescription('Fill out your complete profile information')
			.addStep({ id: 'step-1', title: 'Profile' })
			.addElement('fieldSet', {
				id: 'profile',
				name: 'profile',
				legend: 'Profile Information',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'fullName',
						name: 'fullName',
						label: 'Full Name',
						placeholder: 'John Doe',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'fieldSet',
						id: 'primaryAddress',
						name: 'primaryAddress',
						legend: 'Primary Address',
						elements: [
							{
								$type: 'input',
								inputType: 'text',
								id: 'street',
								name: 'street',
								label: 'Street',
								placeholder: '123 Main St',
								rules: [ValidationPresets.string.required()],
							},
							{
								$type: 'input',
								inputType: 'text',
								id: 'city',
								name: 'city',
								label: 'City',
								placeholder: 'New York',
								rules: [ValidationPresets.string.required()],
							},
							{
								$type: 'input',
								inputType: 'text',
								id: 'zipCode',
								name: 'zipCode',
								label: 'ZIP Code',
								placeholder: '10001',
								rules: [ValidationPresets.string.required()],
							},
						],
					},
					{
						$type: 'fieldSet',
						id: 'secondaryAddress',
						name: 'secondaryAddress',
						legend: 'Secondary Address (Optional)',
						elements: [
							{
								$type: 'input',
								inputType: 'text',
								id: 'street',
								name: 'street',
								label: 'Street',
								placeholder: '456 Oak Ave',
							},
							{
								$type: 'input',
								inputType: 'text',
								id: 'city',
								name: 'city',
								label: 'City',
								placeholder: 'Los Angeles',
							},
							{
								$type: 'input',
								inputType: 'text',
								id: 'zipCode',
								name: 'zipCode',
								label: 'ZIP Code',
								placeholder: '90001',
							},
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Profile', name: 'submit' })
			.build(),
	},
};

/**
 * Fieldset with textarea for longer content
 */
export const FieldSetWithTextarea: Story = {
	args: {
		config: createForm()
			.setId('fieldset-textarea')
			.setTitle('Job Application')
			.setDescription('Apply for a position')
			.addStep({ id: 'step-1', title: 'Application' })
			.addElement('fieldSet', {
				id: 'jobApplication',
				name: 'jobApplication',
				legend: 'Application Details',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'position',
						name: 'position',
						label: 'Position Applied For',
						placeholder: 'Senior Developer',
						rules: [ValidationPresets.string.required()],
					},
					{
						$type: 'textarea',
						id: 'coverLetter',
						name: 'coverLetter',
						label: 'Cover Letter',
						placeholder: 'Tell us why you are interested in this position...',
						rows: 6,
						rules: [
							ValidationPresets.string.required('Cover letter is required'),
							ValidationPresets.string.minLength(50, 'Cover letter must be at least 50 characters'),
						],
					},
					{
						$type: 'textarea',
						id: 'experience',
						name: 'experience',
						label: 'Relevant Experience',
						placeholder: 'Describe your relevant experience...',
						rows: 4,
						rules: [ValidationPresets.string.required('Please describe your experience')],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit Application', name: 'submit' })
			.build(),
	},
};
