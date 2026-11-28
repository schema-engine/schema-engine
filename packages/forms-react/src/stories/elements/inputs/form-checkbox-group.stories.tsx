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
		engine: { table: { disable: true } },
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
		config: defineStoryForm({
			id: 'checkbox-group-default',
			title: 'Checkbox Group',
			steps: [
				{
					id: 'step-1',
					title: 'Select Options',
					elements: [
						{
							$type: 'checkbox-group',
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
						},
					],
				},
			],
		}),
	},
};

export const HorizontalOrientation: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-group-horizontal',
			title: 'Horizontal Checkboxes',
			steps: [
				{
					id: 'step-1',
					title: 'Select Preferences',
					elements: [
						{
							$type: 'checkbox-group',
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
			id: 'checkbox-group-validation',
			title: 'Required Selection',
			steps: [
				{
					id: 'step-1',
					title: 'Confirm Choices',
					elements: [
						{
							$type: 'checkbox-group',
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
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleGroups: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-group-multiple',
			title: 'Survey Form',
			description: 'Select your preferences for each category',
			steps: [
				{
					id: 'step-1',
					title: 'Preferences',
					elements: [
						{
							$type: 'checkbox-group',
							id: 'hobbies',
							name: 'hobbies',
							label: 'Hobbies',
							options: [
								{ value: 'reading', label: 'Reading' },
								{ value: 'sports', label: 'Sports' },
								{ value: 'travel', label: 'Travel' },
								{ value: 'cooking', label: 'Cooking' },
							],
						},
						{
							$type: 'checkbox-group',
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
						},
						{ $type: 'submit', id: 'submit', label: 'Submit Survey', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const ProductSelection: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-group-products',
			title: 'Add-ons Selection',
			description: 'Choose add-ons for your order',
			steps: [
				{
					id: 'step-1',
					title: 'Add-ons',
					elements: [
						{
							$type: 'checkbox-group',
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
						},
						{ $type: 'submit', id: 'submit', label: 'Continue to Checkout', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const DisabledOptions: Story = {
	args: {
		config: defineStoryForm({
			id: 'checkbox-group-disabled',
			title: 'Disabled Options',
			description: 'Some options are not available',
			steps: [
				{
					id: 'step-1',
					title: 'Features',
					elements: [
						{
							$type: 'checkbox-group',
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
			id: 'checkbox-group-mixed',
			title: 'Mixed Checkbox States',
			description: 'Combination of enabled and disabled options',
			steps: [
				{
					id: 'step-1',
					title: 'Feature Selection',
					elements: [
						{
							$type: 'checkbox-group',
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
						},
						{
							$type: 'checkbox-group',
							id: 'notifications',
							name: 'notifications',
							label: 'Notification Settings',
							orientation: 'horizontal',
							options: [
								{ value: 'email', label: 'Email' },
								{ value: 'sms', label: 'SMS' },
								{ value: 'push', label: 'Push' },
							],
						},
						{ $type: 'submit', id: 'submit', label: 'Save Preferences', name: 'submit' },
					],
				},
			],
		}),
	},
};
