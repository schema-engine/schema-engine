import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { createForm, ValidationPresets } from '../shared/form-builder';

const meta = {
	title: 'Elements/Actions/SubmitButton',
	component: FormRenderer,
	parameters: {
		layout: 'padded',
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
			description: 'Form configuration with submit button',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('submit-default')
			.setTitle('Submit Button')
			.addStep({ id: 'step-1', title: 'Simple Form' })
			.addElement('input', {
				id: 'name',
				name: 'name',
				label: 'Name',
				placeholder: 'Enter your name',
				inputType: 'text',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Submit',
			})
			.build(),
	},
};

export const CustomLabel: Story = {
	args: {
		config: createForm()
			.setId('submit-custom-label')
			.setTitle('Custom Button Label')
			.addStep({ id: 'step-1', title: 'Registration' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'your.email@example.com',
				inputType: 'email',
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Create Account',
			})
			.build(),
	},
};

export const WithFormValidation: Story = {
	args: {
		config: createForm()
			.setId('submit-validation')
			.setTitle('Form Validation')
			.setDescription('Submit button is only enabled when form is valid')
			.addStep({ id: 'step-1', title: 'Contact Form' })
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
				rules: [ValidationPresets.string.email('Please enter a valid email')],
			})
			.addElement('textarea', {
				id: 'message',
				name: 'message',
				label: 'Message',
				placeholder: 'Your message...',
				rows: 4,
				rules: [
					ValidationPresets.string.required('Message is required'),
					ValidationPresets.string.minLength(10, 'Message must be at least 10 characters'),
				],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Send Message',
			})
			.build(),
	},
};

export const LoginForm: Story = {
	args: {
		config: createForm()
			.setId('submit-login')
			.setTitle('Login')
			.addStep({ id: 'step-1', title: 'Sign In' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email',
				placeholder: 'your.email@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				placeholder: 'Enter your password',
				inputType: 'password',
				rules: [ValidationPresets.string.required('Password is required')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Sign In',
			})
			.build(),
	},
};

export const SignupForm: Story = {
	args: {
		config: createForm()
			.setId('submit-signup')
			.setTitle('Create Account')
			.setDescription('Sign up for a free account')
			.addStep({ id: 'step-1', title: 'Registration' })
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
				rules: [ValidationPresets.string.email()],
			})
			.addElement('input', {
				id: 'password',
				name: 'password',
				label: 'Password',
				inputType: 'password',
				description: 'At least 8 characters',
				rules: [ValidationPresets.string.required(), ValidationPresets.string.minLength(8)],
			})
			.addElement('checkbox', {
				id: 'terms',
				name: 'terms',
				label: 'I agree to the terms and conditions',
				rules: [ValidationPresets.string.required('You must accept the terms')],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Create Account',
			})
			.build(),
	},
};

export const SubscriptionForm: Story = {
	args: {
		config: createForm()
			.setId('submit-subscription')
			.setTitle('Subscribe')
			.setDescription('Join our newsletter')
			.addStep({ id: 'step-1', title: 'Newsletter' })
			.addElement('input', {
				id: 'email',
				name: 'email',
				label: 'Email Address',
				placeholder: 'your.email@example.com',
				inputType: 'email',
				rules: [ValidationPresets.string.email('Please enter a valid email')],
			})
			.addElement('select', {
				id: 'frequency',
				name: 'frequency',
				label: 'Email Frequency',
				placeholder: 'Select frequency',
				options: [
					{ value: 'daily', label: 'Daily' },
					{ value: 'weekly', label: 'Weekly' },
					{ value: 'monthly', label: 'Monthly' },
				],
				rules: [ValidationPresets.string.required()],
			})
			.addElement('submit', {
				id: 'submit',
				name: 'submit',
				label: 'Subscribe Now',
			})
			.build(),
	},
};
