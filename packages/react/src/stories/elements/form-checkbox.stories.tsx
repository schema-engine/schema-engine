import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { createForm, ValidationPresets } from '../shared/form-builder';

const meta = {
	title: 'Elements/Inputs/FormCheckbox',
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Checkbox element for boolean selections and opt-in choices with support for validation rules.',
			},
		},
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
			description: 'Form configuration with checkbox element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('checkbox-default')
			.setTitle('Checkbox Field')
			.addStep({ id: 'step-1', title: 'Preferences' })
			.addElement('checkbox', {
				id: 'newsletter',
				name: 'newsletter',
				label: 'Subscribe to newsletter',
				description: 'Get weekly updates about new features',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('checkbox-validation')
			.setTitle('Terms and Conditions')
			.addStep({ id: 'step-1', title: 'Agreement' })
			.addElement('checkbox', {
				id: 'terms',
				name: 'terms',
				label: 'I agree to the terms and conditions',
				description: 'You must accept the terms to continue',
				rules: [ValidationPresets.string.required('You must accept the terms and conditions')],
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const MultipleCheckboxes: Story = {
	args: {
		config: createForm()
			.setId('checkbox-multiple')
			.setTitle('Preferences')
			.setDescription('Customize your experience')
			.addStep({ id: 'step-1', title: 'Notification Settings' })
			.addElement('checkbox', {
				id: 'emailNotifications',
				name: 'emailNotifications',
				label: 'Email notifications',
				description: 'Receive notifications via email',
			})
			.addElement('checkbox', {
				id: 'pushNotifications',
				name: 'pushNotifications',
				label: 'Push notifications',
				description: 'Receive push notifications on your device',
			})
			.addElement('checkbox', {
				id: 'smsNotifications',
				name: 'smsNotifications',
				label: 'SMS notifications',
				description: 'Receive notifications via text message',
			})
			.addElement('checkbox', {
				id: 'marketing',
				name: 'marketing',
				label: 'Marketing communications',
				description: 'Receive promotional emails and offers',
			})
			.build(),
	},
};

export const WithRequiredCheckboxes: Story = {
	args: {
		config: createForm()
			.setId('checkbox-required-multiple')
			.setTitle('Account Setup')
			.setDescription('Complete your profile')
			.addStep({ id: 'step-1', title: 'Agreements' })
			.addElement('checkbox', {
				id: 'terms',
				name: 'terms',
				label: 'I accept the Terms of Service',
				rules: [ValidationPresets.string.required('You must accept the Terms of Service')],
			})
			.addElement('checkbox', {
				id: 'privacy',
				name: 'privacy',
				label: 'I accept the Privacy Policy',
				rules: [ValidationPresets.string.required('You must accept the Privacy Policy')],
			})
			.addElement('checkbox', {
				id: 'age',
				name: 'age',
				label: 'I confirm I am at least 18 years old',
				rules: [ValidationPresets.string.required('You must confirm your age')],
			})
			.addElement('checkbox', {
				id: 'newsletter',
				name: 'newsletter',
				label: 'Send me promotional emails',
				description: 'Optional - Unsubscribe anytime',
			})
			.addElement('submit', { id: 'submit', label: 'Create Account', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('checkbox-disabled')
			.setTitle('Disabled Checkbox States')
			.setDescription('Examples of disabled checkboxes')
			.addStep({ id: 'step-1', title: 'Settings' })
			.addElement('checkbox', {
				id: 'disabledUnchecked',
				name: 'disabledUnchecked',
				label: 'Disabled (unchecked)',
				description: 'This checkbox is disabled and unchecked',
				disabled: true,
			})
			.addElement('checkbox', {
				id: 'disabledChecked',
				name: 'disabledChecked',
				label: 'Disabled (checked)',
				description: 'This checkbox is disabled and checked',
				disabled: true,
				defaultValue: true,
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('checkbox-mixed')
			.setTitle('Mixed Checkbox States')
			.setDescription('Combination of enabled and disabled checkboxes')
			.addStep({ id: 'step-1', title: 'Subscription Settings' })
			.addElement('checkbox', {
				id: 'premiumActive',
				name: 'premiumActive',
				label: 'Premium subscription',
				description: 'Your premium subscription is active',
				disabled: true,
				defaultValue: true,
			})
			.addElement('checkbox', {
				id: 'emailNotifications',
				name: 'emailNotifications',
				label: 'Email notifications',
				description: 'Receive updates via email',
			})
			.addElement('checkbox', {
				id: 'pushNotifications',
				name: 'pushNotifications',
				label: 'Push notifications',
				description: 'Receive push notifications',
			})
			.addElement('checkbox', {
				id: 'betaFeatures',
				name: 'betaFeatures',
				label: 'Beta features',
				description: 'Currently unavailable for your plan',
				disabled: true,
			})
			.build(),
	},
};
