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
					'Checkbox element for boolean selections and opt-in choices with support for validation rules. Base UI implementation.',
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
			description: 'Form configuration with checkbox element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-default',
			title: 'Checkbox Field',
			steps: [
				{
					id: 'step-1',
					title: 'Preferences',
					elements: [
						{
							$type: 'checkbox',
							id: 'newsletter',
							name: 'newsletter',
							label: 'Subscribe to newsletter',
							description: 'Get weekly updates about new features',
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
			id: 'checkbox-validation',
			title: 'Terms and Conditions',
			steps: [
				{
					id: 'step-1',
					title: 'Agreement',
					elements: [
						{
							$type: 'checkbox',
							id: 'terms',
							name: 'terms',
							label: 'I agree to the terms and conditions',
							description: 'You must accept the terms to continue',
							rules: [ValidationPresets.string.required('You must accept the terms and conditions')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleCheckboxes: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-multiple',
			title: 'Preferences',
			description: 'Customize your experience',
			steps: [
				{
					id: 'step-1',
					title: 'Notification Settings',
					elements: [
						{
							$type: 'checkbox',
							id: 'emailNotifications',
							name: 'emailNotifications',
							label: 'Email notifications',
							description: 'Receive notifications via email',
						},
						{
							$type: 'checkbox',
							id: 'pushNotifications',
							name: 'pushNotifications',
							label: 'Push notifications',
							description: 'Receive push notifications on your device',
						},
						{
							$type: 'checkbox',
							id: 'smsNotifications',
							name: 'smsNotifications',
							label: 'SMS notifications',
							description: 'Receive notifications via text message',
						},
						{
							$type: 'checkbox',
							id: 'marketing',
							name: 'marketing',
							label: 'Marketing communications',
							description: 'Receive promotional emails and offers',
						},
					],
				},
			],
		}),
	},
};

export const WithRequiredCheckboxes: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-required-multiple',
			title: 'Account Setup',
			description: 'Complete your profile',
			steps: [
				{
					id: 'step-1',
					title: 'Agreements',
					elements: [
						{
							$type: 'checkbox',
							id: 'terms',
							name: 'terms',
							label: 'I accept the Terms of Service',
							rules: [ValidationPresets.string.required('You must accept the Terms of Service')],
						},
						{
							$type: 'checkbox',
							id: 'privacy',
							name: 'privacy',
							label: 'I accept the Privacy Policy',
							rules: [ValidationPresets.string.required('You must accept the Privacy Policy')],
						},
						{
							$type: 'checkbox',
							id: 'age',
							name: 'age',
							label: 'I confirm I am at least 18 years old',
							rules: [ValidationPresets.string.required('You must confirm your age')],
						},
						{
							$type: 'checkbox',
							id: 'newsletter',
							name: 'newsletter',
							label: 'Send me promotional emails',
							description: 'Optional - Unsubscribe anytime',
						},
						{ $type: 'submit', id: 'submit', label: 'Create Account', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-disabled',
			title: 'Disabled Checkbox States',
			description: 'Examples of disabled checkboxes',
			steps: [
				{
					id: 'step-1',
					title: 'Settings',
					elements: [
						{
							$type: 'checkbox',
							id: 'disabledUnchecked',
							name: 'disabledUnchecked',
							label: 'Disabled (unchecked)',
							description: 'This checkbox is disabled and unchecked',
							disabled: true,
						},
						{
							$type: 'checkbox',
							id: 'disabledChecked',
							name: 'disabledChecked',
							label: 'Disabled (checked)',
							description: 'This checkbox is disabled and checked',
							disabled: true,
							defaultValue: true,
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
			id: 'checkbox-mixed',
			title: 'Mixed Checkbox States',
			description: 'Combination of enabled and disabled checkboxes',
			steps: [
				{
					id: 'step-1',
					title: 'Subscription Settings',
					elements: [
						{
							$type: 'checkbox',
							id: 'premiumActive',
							name: 'premiumActive',
							label: 'Premium subscription',
							description: 'Your premium subscription is active',
							disabled: true,
							defaultValue: true,
						},
						{
							$type: 'checkbox',
							id: 'emailNotifications',
							name: 'emailNotifications',
							label: 'Email notifications',
							description: 'Receive updates via email',
						},
						{
							$type: 'checkbox',
							id: 'pushNotifications',
							name: 'pushNotifications',
							label: 'Push notifications',
							description: 'Receive push notifications',
						},
						{
							$type: 'checkbox',
							id: 'betaFeatures',
							name: 'betaFeatures',
							label: 'Beta features',
							description: 'Currently unavailable for your plan',
							disabled: true,
						},
					],
				},
			],
		}),
	},
};
