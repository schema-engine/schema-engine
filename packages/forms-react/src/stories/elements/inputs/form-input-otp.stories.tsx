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
		engine: { table: { disable: true } },
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
		config: defineStoryForm({
			id: 'otp-default',
			title: 'OTP Verification',
			steps: [
				{
					id: 'step-1',
					title: 'Enter OTP',
					elements: [
						{
							$type: 'input-otp',
							id: 'otp',
							name: 'otp',
							label: 'Enter Code',
							length: 6,
							pattern: 'numeric',
							description: 'Enter the 6-digit code sent to your phone',
						},
					],
				},
			],
		}),
	},
};

export const FourDigitOTP: Story = {
	args: {
		config: defineStoryForm({
			id: 'otp-four-digit',
			title: 'Quick Verification',
			steps: [
				{
					id: 'step-1',
					title: 'Enter Code',
					elements: [
						{
							$type: 'input-otp',
							id: 'code',
							name: 'code',
							label: 'Verification Code',
							length: 4,
							pattern: 'numeric',
							description: 'Enter the 4-digit code',
						},
					],
				},
			],
		}),
	},
};

export const AlphanumericOTP: Story = {
	args: {
		config: defineStoryForm({
			id: 'otp-alphanumeric',
			title: 'Code Entry',
			steps: [
				{
					id: 'step-1',
					title: 'Enter Confirmation Code',
					elements: [
						{
							$type: 'input-otp',
							id: 'confirmationCode',
							name: 'confirmationCode',
							label: 'Confirmation Code',
							length: 8,
							pattern: 'alphanumeric',
							description: 'Enter your unique confirmation code (letters and numbers)',
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
			id: 'otp-validation',
			title: 'Secure Verification',
			steps: [
				{
					id: 'step-1',
					title: 'Enter OTP',
					elements: [
						{
							$type: 'input-otp',
							id: 'otp',
							name: 'otp',
							label: 'One-Time Password',
							length: 6,
							pattern: 'numeric',
							rules: [ValidationPresets.string.required('OTP is required')],
							description: 'Enter the 6-digit code for verification',
						},
						{ $type: 'submit', id: 'submit', label: 'Verify', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleOTPFields: Story = {
	args: {
		config: defineStoryForm({
			id: 'otp-multiple',
			title: 'Two-Factor Authentication',
			description: 'Complete both verification steps',
			steps: [
				{
					id: 'step-1',
					title: 'First Verification',
					elements: [
						{
							$type: 'input-otp',
							id: 'smsOtp',
							name: 'smsOtp',
							label: 'SMS Code',
							length: 6,
							pattern: 'numeric',
							description: 'Enter the code sent to your phone',
							rules: [ValidationPresets.string.required('SMS code is required')],
						},
					],
				},
				{
					id: 'step-2',
					title: 'Second Verification',
					elements: [
						{
							$type: 'input-otp',
							id: 'emailOtp',
							name: 'emailOtp',
							label: 'Email Code',
							length: 6,
							pattern: 'numeric',
							description: 'Enter the code sent to your email',
							rules: [ValidationPresets.string.required('Email code is required')],
						},
					],
				},
			],
		}),
	},
};

export const VariedLengths: Story = {
	args: {
		config: defineStoryForm({
			id: 'otp-varied',
			title: 'Verification Codes',
			description: 'Different code lengths for different purposes',
			steps: [
				{
					id: 'step-1',
					title: 'Verification',
					elements: [
						{
							$type: 'input-otp',
							id: 'quickCode',
							name: 'quickCode',
							label: 'Quick Code',
							length: 4,
							pattern: 'numeric',
							description: '4-digit quick code',
						},
						{
							$type: 'input-otp',
							id: 'standardCode',
							name: 'standardCode',
							label: 'Standard Code',
							length: 6,
							pattern: 'numeric',
							description: '6-digit standard code',
						},
						{
							$type: 'input-otp',
							id: 'secureCode',
							name: 'secureCode',
							label: 'Secure Code',
							length: 8,
							pattern: 'alphanumeric',
							description: '8-character secure code',
						},
						{ $type: 'submit', id: 'submit', label: 'Verify All', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'otp-disabled',
			title: 'Disabled OTP Fields',
			description: 'Examples of disabled OTP inputs',
			steps: [
				{
					id: 'step-1',
					title: 'Read-only Verification',
					elements: [
						{
							$type: 'input-otp',
							id: 'confirmedOtp',
							name: 'confirmedOtp',
							label: 'Confirmed Code',
							length: 6,
							pattern: 'numeric',
							disabled: true,
							description: 'Code already verified',
						},
						{
							$type: 'input-otp',
							id: 'backupCode',
							name: 'backupCode',
							label: 'Backup Code',
							length: 8,
							pattern: 'alphanumeric',
							disabled: true,
							description: 'Backup code on file',
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
			id: 'otp-mixed',
			title: 'Multi-Step Verification',
			description: 'Progressive verification with different states',
			steps: [
				{
					id: 'step-1',
					title: 'Primary Verification',
					elements: [
						{
							$type: 'input-otp',
							id: 'primaryOtp',
							name: 'primaryOtp',
							label: 'Verification Code',
							length: 6,
							pattern: 'numeric',
							description: 'Enter the code sent to your registered phone',
							rules: [ValidationPresets.string.required('Verification code is required')],
						},
					],
				},
				{
					id: 'step-2',
					title: 'Backup Verification',
					elements: [
						{
							$type: 'input-otp',
							id: 'backupOtp',
							name: 'backupOtp',
							label: 'Backup Code',
							length: 8,
							pattern: 'alphanumeric',
							description: "If you don't have access to your phone",
						},
						{
							$type: 'input-otp',
							id: 'previousCode',
							name: 'previousCode',
							label: 'Previous Code',
							length: 6,
							pattern: 'numeric',
							disabled: true,
							description: 'Your previous verification code',
						},
					],
				},
			],
		}),
	},
};
