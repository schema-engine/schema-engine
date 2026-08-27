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
					'Text input element for single-line text entry with support for various input types (text, email, password, url, tel) and validation rules. Base UI implementation.',
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
			description: 'Form configuration with input element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('input-default')
			.setTitle('Text Input')
			.addStep({ id: 'step-1', title: 'Basic Input' })
			.addElement('input', {
				id: 'text',
				name: 'text',
				label: 'Full Name',
				placeholder: 'Enter your name',
				inputType: 'text',
			})
			.build(),
	},
};

export const Email: Story = {
	args: {
		config: createForm()
			.setId('input-email')
			.setTitle('Email Input')
			.addStep({ id: 'step-1', title: 'Email Field' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				description: 'We will never share your email',
			})
			.build(),
	},
};

export const Password: Story = {
	args: {
		config: createForm()
			.setId('input-password')
			.setTitle('Password Input')
			.addStep({ id: 'step-1', title: 'Password Field' })
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				placeholder: 'Enter your password',
				inputType: 'password',
				description: 'Must be at least 8 characters',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('input-validation')
			.setTitle('Input with Validation')
			.addStep({ id: 'step-1', title: 'Validated Inputs' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [ValidationPresets.string.required('Name is required'), ValidationPresets.string.minLength(2)],
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [
					ValidationPresets.string.required('Email is required'),
					ValidationPresets.string.email('Please enter a valid email address'),
				],
			})
			.addElement('input', {
				id: 'url',
				name: 'url',
				label: 'Website URL',
				placeholder: 'https://example.com',
				inputType: 'url',
				rules: [ValidationPresets.string.url('Please enter a valid URL')],
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

export const ComplexValidation: Story = {
	args: {
		config: createForm()
			.setId('input-complex-validation')
			.setTitle('Complex Password Validation')
			.addStep({ id: 'step-1', title: 'Secure Password' })
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Create Password',
				inputType: 'password',
				description: 'At least 8 characters with letters, numbers, and symbols',
				rules: [
					ValidationPresets.string.required('Password is required'),
					ValidationPresets.string.minLength(8, 'Must be at least 8 characters'),
					ValidationPresets.string.pattern('(?=.*[A-Za-z])', 'Must include letters'),
					ValidationPresets.string.pattern('(?=.*\\d)', 'Must include numbers'),
					ValidationPresets.string.pattern('(?=.*[@$!%*#?&])', 'Must include special characters'),
				],
			})
			.addElement('submit', { id: 'submit', label: 'Create Account', name: 'submit' })
			.build(),
	},
};

export const MultipleInputs: Story = {
	args: {
		config: createForm()
			.setId('input-multiple')
			.setTitle('Contact Form')
			.setDescription('All input types in one form')
			.addStep({ id: 'step-1', title: 'Contact Information' })
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
				label: 'Email',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.required('Email is required'), ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '+1 (555) 123-4567',
				inputType: 'tel',
			})
			.addElement('input', {
				id: 'website',
				name: 'website',
				label: 'Website',
				placeholder: 'https://example.com',
				inputType: 'url',
			})
			.addElement('masked-input', {
				id: 'iban',
				name: 'iban',
				label: 'Bank account (IBAN)',
				mask: 'aa00 0000 0000 0000 0000 00',
				placeholder: 'DE89 3704 0044 0532 0130 00',
				description: 'Used for invoice payouts',
				inputMode: 'text',
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('input-disabled')
			.setTitle('Disabled Input States')
			.setDescription('Examples of disabled inputs')
			.addStep({ id: 'step-1', title: 'User Information' })
			.addElement('input', {
				id: 'disabledEmpty',
				name: 'disabledEmpty',
				label: 'Disabled empty input',
				placeholder: 'Cannot edit this',
				inputType: 'text',
				disabled: true,
			})
			.addElement('input', {
				id: 'disabledWithValue',
				name: 'disabledWithValue',
				label: 'Disabled with value',
				inputType: 'text',
				disabled: true,
				defaultValue: 'This field is read-only',
			})
			.addElement('input', {
				id: 'disabledEmail',
				name: 'disabledEmail',
				label: 'Email (verified)',
				inputType: 'email',
				disabled: true,
				defaultValue: 'user@example.com',
				description: 'This email has been verified',
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('input-mixed')
			.setTitle('Mixed Input States')
			.setDescription('Combination of enabled and disabled inputs')
			.addStep({ id: 'step-1', title: 'Account Details' })
			.addElement('input', {
				id: 'username',
				name: 'username',
				label: 'Username',
				inputType: 'text',
				disabled: true,
				defaultValue: 'johndoe',
				description: 'Username cannot be changed',
			})
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'john@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.required(), ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'displayName',
				name: 'displayName',
				label: 'Display Name',
				placeholder: 'Enter display name',
				inputType: 'text',
			})
			.addElement('submit', { id: 'submit', label: 'Update Profile', name: 'submit' })
			.build(),
	},
};
