import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'International phone number input element with country code selection and validation. Supports formatting and international numbers. Base UI implementation.',
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
		config: {
			control: 'object',
			description: 'Form configuration with phone input element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('phone-input-default')
			.setTitle('Phone Number Input')
			.addStep({ id: 'step-1', title: 'Contact Information' })
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter phone number',
				defaultCountry: 'US',
			})
			.build(),
	},
};

export const International: Story = {
	args: {
		config: createForm()
			.setId('phone-input-international')
			.setTitle('International Phone Number')
			.addStep({ id: 'step-1', title: 'Contact Details' })
			.addElement('phone-input', {
				id: 'internationalPhone',
				name: 'internationalPhone',
				label: 'International Phone',
				placeholder: 'Enter phone number',
				description: 'Phone number with country code',
				international: true,
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('phone-input-validation')
			.setTitle('Phone Number with Validation')
			.addStep({ id: 'step-1', title: 'Contact Form' })
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter your phone number',
				defaultCountry: 'US',
				description: 'Enter a valid phone number',
				rules: [
					ValidationPresets.string.required('Phone number is required'),
					ValidationPresets.string.minLength(10, 'Phone number must be at least 10 digits'),
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

export const DifferentCountries: Story = {
	args: {
		config: createForm()
			.setId('phone-input-countries')
			.setTitle('Phone Numbers from Different Countries')
			.addStep({ id: 'step-1', title: 'Multi-Country Form' })
			.addElement('phone-input', {
				id: 'usPhone',
				name: 'usPhone',
				label: 'US Phone Number',
				placeholder: '(555) 123-4567',
				defaultCountry: 'US',
			})
			.addElement('phone-input', {
				id: 'ukPhone',
				name: 'ukPhone',
				label: 'UK Phone Number',
				placeholder: '7700 900000',
				defaultCountry: 'GB',
			})
			.addElement('phone-input', {
				id: 'italyPhone',
				name: 'italyPhone',
				label: 'Italy Phone Number',
				placeholder: '312 345 6789',
				defaultCountry: 'IT',
			})
			.addElement('phone-input', {
				id: 'japanPhone',
				name: 'japanPhone',
				label: 'Japan Phone Number',
				placeholder: '90-1234-5678',
				defaultCountry: 'JP',
			})
			.build(),
	},
};

export const RequiredField: Story = {
	args: {
		config: createForm()
			.setId('phone-input-required')
			.setTitle('Required Phone Input')
			.addStep({ id: 'step-1', title: 'Contact Information' })
			.addElement('phone-input', {
				id: 'requiredPhone',
				name: 'requiredPhone',
				label: 'Phone Number',
				placeholder: 'Enter your phone number',
				defaultCountry: 'US',
				description: 'This field is required',
				rules: [ValidationPresets.string.required('Please provide a phone number')],
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const ContactForm: Story = {
	args: {
		config: createForm()
			.setId('phone-input-contact-form')
			.setTitle('Complete Contact Form')
			.setDescription('Fill in your contact details')
			.addStep({ id: 'step-1', title: 'Personal Information' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.required(), ValidationPresets.string.email()],
			})
			.addElement('phone-input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: 'Enter phone number',
				defaultCountry: 'US',
				description: 'We will use this for important updates',
				rules: [ValidationPresets.string.required('Phone number is required')],
			})
			.addElement('phone-input', {
				id: 'alternatePhone',
				name: 'alternatePhone',
				label: 'Alternate Phone (Optional)',
				placeholder: 'Enter alternate phone number',
				defaultCountry: 'US',
			})
			.addElement('submit', { id: 'submit', label: 'Submit Contact Info', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('phone-input-disabled')
			.setTitle('Disabled Phone Input')
			.setDescription('Examples of disabled phone inputs')
			.addStep({ id: 'step-1', title: 'Account Information' })
			.addElement('phone-input', {
				id: 'disabledEmpty',
				name: 'disabledEmpty',
				label: 'Disabled phone input',
				placeholder: 'Cannot edit',
				defaultCountry: 'US',
				disabled: true,
			})
			.addElement('phone-input', {
				id: 'disabledWithValue',
				name: 'disabledWithValue',
				label: 'Verified Phone Number',
				defaultCountry: 'US',
				disabled: true,
				defaultValue: '+15551234567',
				description: 'This phone number has been verified',
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('phone-input-mixed')
			.setTitle('Mixed Phone Input States')
			.setDescription('Combination of enabled and disabled phone inputs')
			.addStep({ id: 'step-1', title: 'Update Contact Details' })
			.addElement('phone-input', {
				id: 'primaryPhone',
				name: 'primaryPhone',
				label: 'Primary Phone',
				defaultCountry: 'US',
				disabled: true,
				defaultValue: '+15551234567',
				description: 'Primary phone cannot be changed here',
			})
			.addElement('phone-input', {
				id: 'mobilePhone',
				name: 'mobilePhone',
				label: 'Mobile Phone',
				placeholder: 'Enter mobile number',
				defaultCountry: 'US',
				rules: [ValidationPresets.string.required()],
			})
			.addElement('phone-input', {
				id: 'workPhone',
				name: 'workPhone',
				label: 'Work Phone (Optional)',
				placeholder: 'Enter work number',
				defaultCountry: 'US',
			})
			.addElement('submit', { id: 'submit', label: 'Update Phone Numbers', name: 'submit' })
			.build(),
	},
};
