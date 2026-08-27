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
		adapter: { table: { disable: true } },
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
		config: createForm()
			.setId('switch-default')
			.setTitle('Switch Field')
			.addStep({ id: 'step-1', title: 'Settings' })
			.addElement('switch', {
				id: 'notifications',
				name: 'notifications',
				label: 'Enable notifications',
				description: 'Receive alerts about important updates',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('switch-validation')
			.setTitle('Terms Acceptance')
			.addStep({ id: 'step-1', title: 'Agreement' })
			.addElement('switch', {
				id: 'terms',
				name: 'terms',
				label: 'I agree to the terms and conditions',
				description: 'Please read and accept our terms to continue',
				rules: [ValidationPresets.string.required('You must accept the terms to continue')],
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const MultipleSwitches: Story = {
	args: {
		config: createForm()
			.setId('switch-multiple')
			.setTitle('Privacy Settings')
			.setDescription('Control your privacy preferences')
			.addStep({ id: 'step-1', title: 'Preferences' })
			.addElement('switch', {
				id: 'profilePublic',
				name: 'profilePublic',
				label: 'Make profile public',
				description: 'Allow others to view your profile',
			})
			.addElement('switch', {
				id: 'showEmail',
				name: 'showEmail',
				label: 'Show email address',
				description: 'Display your email on your public profile',
			})
			.addElement('switch', {
				id: 'allowMessages',
				name: 'allowMessages',
				label: 'Allow direct messages',
				description: 'Let other users send you messages',
			})
			.addElement('switch', {
				id: 'emailNotifications',
				name: 'emailNotifications',
				label: 'Email notifications',
				description: 'Receive updates via email',
			})
			.build(),
	},
};

export const NotificationSettings: Story = {
	args: {
		config: createForm()
			.setId('switch-notifications')
			.setTitle('Notification Preferences')
			.setDescription('Choose which notifications you want to receive')
			.addStep({ id: 'step-1', title: 'Notification Types' })
			.addElement('switch', {
				id: 'allNotifications',
				name: 'allNotifications',
				label: 'Enable all notifications',
				description: 'Master switch for all notifications',
			})
			.addElement('switch', {
				id: 'emailAlerts',
				name: 'emailAlerts',
				label: 'Email alerts',
				description: 'Get notified via email',
			})
			.addElement('switch', {
				id: 'pushAlerts',
				name: 'pushAlerts',
				label: 'Push notifications',
				description: 'Receive push notifications on your devices',
			})
			.addElement('switch', {
				id: 'smsAlerts',
				name: 'smsAlerts',
				label: 'SMS alerts',
				description: 'Get text message notifications',
			})
			.addElement('switch', {
				id: 'weeklyDigest',
				name: 'weeklyDigest',
				label: 'Weekly digest',
				description: 'Receive a weekly summary email',
			})
			.build(),
	},
};

export const FeatureToggles: Story = {
	args: {
		config: createForm()
			.setId('switch-features')
			.setTitle('Feature Settings')
			.setDescription('Enable or disable features')
			.addStep({ id: 'step-1', title: 'Features' })
			.addElement('switch', {
				id: 'darkMode',
				name: 'darkMode',
				label: 'Dark mode',
				description: 'Use dark theme throughout the app',
			})
			.addElement('switch', {
				id: 'autoSave',
				name: 'autoSave',
				label: 'Auto-save',
				description: 'Automatically save your work',
			})
			.addElement('switch', {
				id: 'spellCheck',
				name: 'spellCheck',
				label: 'Spell check',
				description: 'Check spelling as you type',
			})
			.addElement('switch', {
				id: 'experimentalFeatures',
				name: 'experimentalFeatures',
				label: 'Experimental features',
				description: 'Enable beta features and early access',
			})
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('switch-disabled')
			.setTitle('Disabled Switch States')
			.setDescription('Examples of disabled switches')
			.addStep({ id: 'step-1', title: 'Settings' })
			.addElement('switch', {
				id: 'disabledUnchecked',
				name: 'disabledUnchecked',
				label: 'Disabled (unchecked)',
				description: 'This switch is disabled and unchecked',
				disabled: true,
			})
			.addElement('switch', {
				id: 'disabledChecked',
				name: 'disabledChecked',
				label: 'Disabled (checked)',
				description: 'This switch is disabled and checked',
				disabled: true,
				defaultValue: true,
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('switch-mixed')
			.setTitle('Mixed Switch States')
			.setDescription('Combination of enabled and disabled switches')
			.addStep({ id: 'step-1', title: 'Account Settings' })
			.addElement('switch', {
				id: 'accountActive',
				name: 'accountActive',
				label: 'Account active',
				description: 'Your account is currently active',
				disabled: true,
				defaultValue: true,
			})
			.addElement('switch', {
				id: 'twoFactor',
				name: 'twoFactor',
				label: 'Two-factor authentication',
				description: 'Add an extra layer of security',
			})
			.addElement('switch', {
				id: 'marketing',
				name: 'marketing',
				label: 'Marketing emails',
				description: 'Receive promotional content',
			})
			.addElement('switch', {
				id: 'betaProgram',
				name: 'betaProgram',
				label: 'Beta program',
				description: 'Currently unavailable',
				disabled: true,
			})
			.build(),
	},
};
