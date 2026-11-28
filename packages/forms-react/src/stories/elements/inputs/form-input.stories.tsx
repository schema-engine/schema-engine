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
		config: defineStoryForm({
			id: 'input-default',
			title: 'Text Input',
			steps: [
				{
					id: 'step-1',
					title: 'Basic Input',
					elements: [
						{
							$type: 'input',
							id: 'text',
							name: 'text',
							label: 'Full Name',
							placeholder: 'Enter your name',
							inputType: 'text',
						},
					],
				},
			],
		}),
	},
};

export const Email: Story = {
	args: {
		config: defineStoryForm({
			id: 'input-email',
			title: 'Email Input',
			steps: [
				{
					id: 'step-1',
					title: 'Email Field',
					elements: [
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email Address',
							placeholder: 'john@example.com',
							inputType: 'email',
							description: 'We will never share your email',
						},
					],
				},
			],
		}),
	},
};

export const Password: Story = {
	args: {
		config: defineStoryForm({
			id: 'input-password',
			title: 'Password Input',
			steps: [
				{
					id: 'step-1',
					title: 'Password Field',
					elements: [
						{
							$type: 'input',
							id: 'password',
							name: 'password',
							label: 'Password',
							placeholder: 'Enter your password',
							inputType: 'password',
							description: 'Must be at least 8 characters',
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
			id: 'input-validation',
			title: 'Input with Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Validated Inputs',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Full Name',
							placeholder: 'John Doe',
							inputType: 'text',
							rules: [
								ValidationPresets.string.required('Name is required'),
								ValidationPresets.string.minLength(2),
							],
						},
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email Address',
							placeholder: 'john@example.com',
							inputType: 'email',
							rules: [
								ValidationPresets.string.required('Email is required'),
								ValidationPresets.string.email('Please enter a valid email address'),
							],
						},
						{
							$type: 'input',
							id: 'url',
							name: 'url',
							label: 'Website URL',
							placeholder: 'https://example.com',
							inputType: 'url',
							rules: [ValidationPresets.string.url('Please enter a valid URL')],
						},
						{ $type: 'submit', id: 'submit', label: 'Submit', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const ComplexValidation: Story = {
	args: {
		config: defineStoryForm({
			id: 'input-complex-validation',
			title: 'Complex Password Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Secure Password',
					elements: [
						{
							$type: 'input',
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
						},
						{ $type: 'submit', id: 'submit', label: 'Create Account', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleInputs: Story = {
	args: {
		config: defineStoryForm({
			id: 'input-multiple',
			title: 'Contact Form',
			description: 'All input types in one form',
			steps: [
				{
					id: 'step-1',
					title: 'Contact Information',
					elements: [
						{
							$type: 'input',
							id: 'name',
							name: 'name',
							label: 'Full Name',
							placeholder: 'John Doe',
							inputType: 'text',
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email',
							placeholder: 'john@example.com',
							inputType: 'email',
							rules: [
								ValidationPresets.string.required('Email is required'),
								ValidationPresets.string.email(),
							],
						},
						{
							$type: 'phone-input',
							id: 'phone',
							name: 'phone',
							label: 'Phone Number',
							placeholder: 'Enter phone number',
							defaultCountry: 'US',
						},
						{
							$type: 'input',
							id: 'website',
							name: 'website',
							label: 'Website',
							placeholder: 'https://example.com',
							inputType: 'url',
						},
						{
							$type: 'masked-input',
							id: 'iban',
							name: 'iban',
							label: 'Bank account (IBAN)',
							mask: 'aa00 0000 0000 0000 0000 00',
							placeholder: 'DE89 3704 0044 0532 0130 00',
							description: 'Used for invoice payouts',
							inputMode: 'text',
						},
						{ $type: 'submit', id: 'submit', label: 'Submit', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'input-disabled',
			title: 'Disabled Input States',
			description: 'Examples of disabled inputs',
			steps: [
				{
					id: 'step-1',
					title: 'User Information',
					elements: [
						{
							$type: 'input',
							id: 'disabledEmpty',
							name: 'disabledEmpty',
							label: 'Disabled empty input',
							placeholder: 'Cannot edit this',
							inputType: 'text',
							disabled: true,
						},
						{
							$type: 'input',
							id: 'disabledWithValue',
							name: 'disabledWithValue',
							label: 'Disabled with value',
							inputType: 'text',
							disabled: true,
							defaultValue: 'This field is read-only',
						},
						{
							$type: 'input',
							id: 'disabledEmail',
							name: 'disabledEmail',
							label: 'Email (verified)',
							inputType: 'email',
							disabled: true,
							defaultValue: 'user@example.com',
							description: 'This email has been verified',
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
			id: 'input-mixed',
			title: 'Mixed Input States',
			description: 'Combination of enabled and disabled inputs',
			steps: [
				{
					id: 'step-1',
					title: 'Account Details',
					elements: [
						{
							$type: 'input',
							id: 'username',
							name: 'username',
							label: 'Username',
							inputType: 'text',
							disabled: true,
							defaultValue: 'johndoe',
							description: 'Username cannot be changed',
						},
						{
							$type: 'input',
							id: 'email',
							name: 'email',
							label: 'Email Address',
							placeholder: 'john@example.com',
							inputType: 'email',
							rules: [ValidationPresets.string.required(), ValidationPresets.string.email()],
						},
						{
							$type: 'input',
							id: 'displayName',
							name: 'displayName',
							label: 'Display Name',
							placeholder: 'Enter display name',
							inputType: 'text',
						},
						{ $type: 'submit', id: 'submit', label: 'Update Profile', name: 'submit' },
					],
				},
			],
		}),
	},
};
