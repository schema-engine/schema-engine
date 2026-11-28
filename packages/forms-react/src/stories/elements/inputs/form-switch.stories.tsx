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
					'Toggle switch element for binary on/off states, ideal for settings and preferences with validation support. Base UI implementation.',
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
			description: 'Form configuration with switch element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'switch-default',
			title: 'Switch Field',
			steps: [
				{
					id: 'step-1',
					title: 'Settings',
					elements: [
						{
							$type: 'switch',
							id: 'notifications',
							name: 'notifications',
							label: 'Enable notifications',
							description: 'Receive alerts about important updates',
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
			id: 'switch-validation',
			title: 'Terms Acceptance',
			steps: [
				{
					id: 'step-1',
					title: 'Agreement',
					elements: [
						{
							$type: 'switch',
							id: 'terms',
							name: 'terms',
							label: 'I agree to the terms and conditions',
							description: 'Please read and accept our terms to continue',
							rules: [ValidationPresets.string.required('You must accept the terms to continue')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleSwitches: Story = {
	args: {
		config: defineStoryForm({
			id: 'switch-multiple',
			title: 'Privacy Settings',
			description: 'Control your privacy preferences',
			steps: [
				{
					id: 'step-1',
					title: 'Preferences',
					elements: [
						{
							$type: 'switch',
							id: 'profilePublic',
							name: 'profilePublic',
							label: 'Make profile public',
							description: 'Allow others to view your profile',
						},
						{
							$type: 'switch',
							id: 'showEmail',
							name: 'showEmail',
							label: 'Show email address',
							description: 'Display your email on your public profile',
						},
						{
							$type: 'switch',
							id: 'allowMessages',
							name: 'allowMessages',
							label: 'Allow direct messages',
							description: 'Let other users send you messages',
						},
						{
							$type: 'switch',
							id: 'emailNotifications',
							name: 'emailNotifications',
							label: 'Email notifications',
							description: 'Receive updates via email',
						},
					],
				},
			],
		}),
	},
};

export const NotificationSettings: Story = {
	args: {
		config: defineStoryForm({
			id: 'switch-notifications',
			title: 'Notification Preferences',
			description: 'Choose which notifications you want to receive',
			steps: [
				{
					id: 'step-1',
					title: 'Notification Types',
					elements: [
						{
							$type: 'switch',
							id: 'allNotifications',
							name: 'allNotifications',
							label: 'Enable all notifications',
							description: 'Master switch for all notifications',
						},
						{
							$type: 'switch',
							id: 'emailAlerts',
							name: 'emailAlerts',
							label: 'Email alerts',
							description: 'Get notified via email',
						},
						{
							$type: 'switch',
							id: 'pushAlerts',
							name: 'pushAlerts',
							label: 'Push notifications',
							description: 'Receive push notifications on your devices',
						},
						{
							$type: 'switch',
							id: 'smsAlerts',
							name: 'smsAlerts',
							label: 'SMS alerts',
							description: 'Get text message notifications',
						},
						{
							$type: 'switch',
							id: 'weeklyDigest',
							name: 'weeklyDigest',
							label: 'Weekly digest',
							description: 'Receive a weekly summary email',
						},
					],
				},
			],
		}),
	},
};

export const FeatureToggles: Story = {
	args: {
		config: defineStoryForm({
			id: 'switch-features',
			title: 'Feature Settings',
			description: 'Enable or disable features',
			steps: [
				{
					id: 'step-1',
					title: 'Features',
					elements: [
						{
							$type: 'switch',
							id: 'darkMode',
							name: 'darkMode',
							label: 'Dark mode',
							description: 'Use dark theme throughout the app',
						},
						{
							$type: 'switch',
							id: 'autoSave',
							name: 'autoSave',
							label: 'Auto-save',
							description: 'Automatically save your work',
						},
						{
							$type: 'switch',
							id: 'spellCheck',
							name: 'spellCheck',
							label: 'Spell check',
							description: 'Check spelling as you type',
						},
						{
							$type: 'switch',
							id: 'experimentalFeatures',
							name: 'experimentalFeatures',
							label: 'Experimental features',
							description: 'Enable beta features and early access',
						},
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'switch-disabled',
			title: 'Disabled Switch States',
			description: 'Examples of disabled switches',
			steps: [
				{
					id: 'step-1',
					title: 'Settings',
					elements: [
						{
							$type: 'switch',
							id: 'disabledUnchecked',
							name: 'disabledUnchecked',
							label: 'Disabled (unchecked)',
							description: 'This switch is disabled and unchecked',
							disabled: true,
						},
						{
							$type: 'switch',
							id: 'disabledChecked',
							name: 'disabledChecked',
							label: 'Disabled (checked)',
							description: 'This switch is disabled and checked',
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
			id: 'switch-mixed',
			title: 'Mixed Switch States',
			description: 'Combination of enabled and disabled switches',
			steps: [
				{
					id: 'step-1',
					title: 'Account Settings',
					elements: [
						{
							$type: 'switch',
							id: 'accountActive',
							name: 'accountActive',
							label: 'Account active',
							description: 'Your account is currently active',
							disabled: true,
							defaultValue: true,
						},
						{
							$type: 'switch',
							id: 'twoFactor',
							name: 'twoFactor',
							label: 'Two-factor authentication',
							description: 'Add an extra layer of security',
						},
						{
							$type: 'switch',
							id: 'marketing',
							name: 'marketing',
							label: 'Marketing emails',
							description: 'Receive promotional content',
						},
						{
							$type: 'switch',
							id: 'betaProgram',
							name: 'betaProgram',
							label: 'Beta program',
							description: 'Currently unavailable',
							disabled: true,
						},
					],
				},
			],
		}),
	},
};
