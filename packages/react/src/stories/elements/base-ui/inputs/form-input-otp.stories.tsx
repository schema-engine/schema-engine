import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.base-ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'One-Time Password input element for numeric or alphanumeric codes with configurable length. Base UI implementation.',
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
			description: 'Form configuration with input-otp element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('otp-default')
			.setTitle('OTP Verification')
			.addStep({ id: 'step-1', title: 'Enter OTP' })
			.addElement('input-otp', {
				id: 'otp',
				name: 'otp',
				label: 'Enter Code',
				length: 6,
				pattern: 'numeric',
				description: 'Enter the 6-digit code sent to your phone',
			})
			.build(),
	},
};

export const FourDigitOTP: Story = {
	args: {
		config: createForm()
			.setId('otp-four-digit')
			.setTitle('Quick Verification')
			.addStep({ id: 'step-1', title: 'Enter Code' })
			.addElement('input-otp', {
				id: 'code',
				name: 'code',
				label: 'Verification Code',
				length: 4,
				pattern: 'numeric',
				description: 'Enter the 4-digit code',
			})
			.build(),
	},
};

export const AlphanumericOTP: Story = {
	args: {
		config: createForm()
			.setId('otp-alphanumeric')
			.setTitle('Code Entry')
			.addStep({ id: 'step-1', title: 'Enter Confirmation Code' })
			.addElement('input-otp', {
				id: 'confirmationCode',
				name: 'confirmationCode',
				label: 'Confirmation Code',
				length: 8,
				pattern: 'alphanumeric',
				description: 'Enter your unique confirmation code (letters and numbers)',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('otp-validation')
			.setTitle('Secure Verification')
			.addStep({ id: 'step-1', title: 'Enter OTP' })
			.addElement('input-otp', {
				id: 'otp',
				name: 'otp',
				label: 'One-Time Password',
				length: 6,
				pattern: 'numeric',
				rules: [ValidationPresets.string.required('OTP is required')],
				description: 'Enter the 6-digit code for verification',
			})
			.addElement('submit', { id: 'submit', label: 'Verify', name: 'submit' })
			.build(),
	},
};

export const MultipleOTPFields: Story = {
	args: {
		config: createForm()
			.setId('otp-multiple')
			.setTitle('Two-Factor Authentication')
			.setDescription('Complete both verification steps')
			.addStep({ id: 'step-1', title: 'First Verification' })
			.addElement('input-otp', {
				id: 'smsOtp',
				name: 'smsOtp',
				label: 'SMS Code',
				length: 6,
				pattern: 'numeric',
				description: 'Enter the code sent to your phone',
				rules: [ValidationPresets.string.required('SMS code is required')],
			})
			.addStep({ id: 'step-2', title: 'Second Verification' })
			.addElement('input-otp', {
				id: 'emailOtp',
				name: 'emailOtp',
				label: 'Email Code',
				length: 6,
				pattern: 'numeric',
				description: 'Enter the code sent to your email',
				rules: [ValidationPresets.string.required('Email code is required')],
			})
			.addElement('submit', { id: 'submit', label: 'Complete Verification', name: 'submit' })
			.build(),
	},
};

export const VariedLengths: Story = {
	args: {
		config: createForm()
			.setId('otp-varied')
			.setTitle('Verification Codes')
			.setDescription('Different code lengths for different purposes')
			.addStep({ id: 'step-1', title: 'Verification' })
			.addElement('input-otp', {
				id: 'quickCode',
				name: 'quickCode',
				label: 'Quick Code',
				length: 4,
				pattern: 'numeric',
				description: '4-digit quick code',
			})
			.addElement('input-otp', {
				id: 'standardCode',
				name: 'standardCode',
				label: 'Standard Code',
				length: 6,
				pattern: 'numeric',
				description: '6-digit standard code',
			})
			.addElement('input-otp', {
				id: 'secureCode',
				name: 'secureCode',
				label: 'Secure Code',
				length: 8,
				pattern: 'alphanumeric',
				description: '8-character secure code',
			})
			.addElement('submit', { id: 'submit', label: 'Verify All', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('otp-disabled')
			.setTitle('Disabled OTP Fields')
			.setDescription('Examples of disabled OTP inputs')
			.addStep({ id: 'step-1', title: 'Read-only Verification' })
			.addElement('input-otp', {
				id: 'confirmedOtp',
				name: 'confirmedOtp',
				label: 'Confirmed Code',
				length: 6,
				pattern: 'numeric',
				disabled: true,
				description: 'Code already verified',
			})
			.addElement('input-otp', {
				id: 'backupCode',
				name: 'backupCode',
				label: 'Backup Code',
				length: 8,
				pattern: 'alphanumeric',
				disabled: true,
				description: 'Backup code on file',
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('otp-mixed')
			.setTitle('Multi-Step Verification')
			.setDescription('Progressive verification with different states')
			.addStep({ id: 'step-1', title: 'Primary Verification' })
			.addElement('input-otp', {
				id: 'primaryOtp',
				name: 'primaryOtp',
				label: 'Verification Code',
				length: 6,
				pattern: 'numeric',
				description: 'Enter the code sent to your registered phone',
				rules: [ValidationPresets.string.required('Verification code is required')],
			})
			.addStep({ id: 'step-2', title: 'Backup Verification' })
			.addElement('input-otp', {
				id: 'backupOtp',
				name: 'backupOtp',
				label: 'Backup Code',
				length: 8,
				pattern: 'alphanumeric',
				description: "If you don't have access to your phone",
			})
			.addElement('input-otp', {
				id: 'previousCode',
				name: 'previousCode',
				label: 'Previous Code',
				length: 6,
				pattern: 'numeric',
				disabled: true,
				description: 'Your previous verification code',
			})
			.addElement('submit', { id: 'submit', label: 'Complete Verification', name: 'submit' })
			.build(),
	},
};
