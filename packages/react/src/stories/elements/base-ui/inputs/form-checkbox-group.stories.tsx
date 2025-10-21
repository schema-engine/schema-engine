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
				component: 'Checkbox group element for selecting multiple options from a set. Base UI implementation.',
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
			description: 'Form configuration with checkbox group element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-default')
			.setTitle('Checkbox Group')
			.addStep({ id: 'step-1', title: 'Select Options' })
			.addElement('checkbox-group', {
				id: 'interests',
				name: 'interests',
				label: 'Interests',
				options: [
					{ value: 'sports', label: 'Sports' },
					{ value: 'music', label: 'Music' },
					{ value: 'reading', label: 'Reading' },
					{ value: 'gaming', label: 'Gaming' },
				],
				description: 'Select all that apply',
			})
			.build(),
	},
};

export const HorizontalOrientation: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-horizontal')
			.setTitle('Horizontal Checkboxes')
			.addStep({ id: 'step-1', title: 'Select Preferences' })
			.addElement('checkbox-group', {
				id: 'preferences',
				name: 'preferences',
				label: 'Display Preferences',
				orientation: 'horizontal',
				options: [
					{ value: 'dark', label: 'Dark Mode' },
					{ value: 'compact', label: 'Compact View' },
					{ value: 'notifications', label: 'Notifications' },
				],
				description: 'Customize your experience',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-validation')
			.setTitle('Required Selection')
			.addStep({ id: 'step-1', title: 'Confirm Choices' })
			.addElement('checkbox-group', {
				id: 'terms',
				name: 'terms',
				label: 'Required Agreements',
				options: [
					{ value: 'privacy', label: 'I agree to the Privacy Policy' },
					{ value: 'terms', label: 'I agree to the Terms of Service' },
					{ value: 'marketing', label: 'I want to receive marketing emails' },
				],
				rules: [ValidationPresets.string.required('You must agree to at least one option')],
				description: 'At least one selection is required',
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const MultipleGroups: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-multiple')
			.setTitle('Survey Form')
			.setDescription('Select your preferences for each category')
			.addStep({ id: 'step-1', title: 'Preferences' })
			.addElement('checkbox-group', {
				id: 'hobbies',
				name: 'hobbies',
				label: 'Hobbies',
				options: [
					{ value: 'reading', label: 'Reading' },
					{ value: 'sports', label: 'Sports' },
					{ value: 'travel', label: 'Travel' },
					{ value: 'cooking', label: 'Cooking' },
				],
			})
			.addElement('checkbox-group', {
				id: 'languages',
				name: 'languages',
				label: 'Languages Spoken',
				options: [
					{ value: 'english', label: 'English' },
					{ value: 'spanish', label: 'Spanish' },
					{ value: 'french', label: 'French' },
					{ value: 'german', label: 'German' },
					{ value: 'chinese', label: 'Chinese' },
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit Survey', name: 'submit' })
			.build(),
	},
};

export const ProductSelection: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-products')
			.setTitle('Add-ons Selection')
			.setDescription('Choose add-ons for your order')
			.addStep({ id: 'step-1', title: 'Add-ons' })
			.addElement('checkbox-group', {
				id: 'addons',
				name: 'addons',
				label: 'Available Add-ons',
				orientation: 'vertical',
				options: [
					{ value: 'warranty', label: 'Extended Warranty (+$29.99)' },
					{ value: 'insurance', label: 'Accidental Damage Protection (+$19.99)' },
					{ value: 'support', label: 'Priority Support (+$9.99)' },
					{ value: 'delivery', label: 'Express Delivery (+$14.99)' },
				],
				description: 'All add-ons are optional',
			})
			.addElement('submit', { id: 'submit', label: 'Continue to Checkout', name: 'submit' })
			.build(),
	},
};

export const DisabledOptions: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-disabled')
			.setTitle('Disabled Options')
			.setDescription('Some options are not available')
			.addStep({ id: 'step-1', title: 'Features' })
			.addElement('checkbox-group', {
				id: 'features',
				name: 'features',
				label: 'Available Features',
				options: [
					{ value: 'basic', label: 'Basic Features', disabled: false },
					{ value: 'advanced', label: 'Advanced Features', disabled: true },
					{ value: 'enterprise', label: 'Enterprise Features', disabled: true },
					{ value: 'premium', label: 'Premium Support', disabled: false },
				],
				description: 'Some features require a higher plan',
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('checkbox-group-mixed')
			.setTitle('Mixed Checkbox States')
			.setDescription('Combination of enabled and disabled options')
			.addStep({ id: 'step-1', title: 'Feature Selection' })
			.addElement('checkbox-group', {
				id: 'features',
				name: 'features',
				label: 'Available Features',
				orientation: 'vertical',
				options: [
					{ value: 'feature1', label: 'Basic Analytics' },
					{ value: 'feature2', label: 'Advanced Reports' },
					{ value: 'feature3', label: 'API Access', disabled: true },
					{ value: 'feature4', label: 'Custom Integration' },
					{ value: 'feature5', label: 'Dedicated Support', disabled: true },
				],
				description: 'Disabled options require an upgrade',
			})
			.addElement('checkbox-group', {
				id: 'notifications',
				name: 'notifications',
				label: 'Notification Settings',
				orientation: 'horizontal',
				options: [
					{ value: 'email', label: 'Email' },
					{ value: 'sms', label: 'SMS' },
					{ value: 'push', label: 'Push' },
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Preferences', name: 'submit' })
			.build(),
	},
};
