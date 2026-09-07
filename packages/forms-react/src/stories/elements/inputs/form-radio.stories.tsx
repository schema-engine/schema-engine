import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { defineStoryForm, getEngine, ValidationPresets, rhfAdapter } from '@/stories/shared/form-builder.ui';

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
					'Radio button element for single-choice selections from a list of mutually exclusive options with validation support. Base UI implementation.',
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
			description: 'Form configuration with radio element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'radio-default',
			title: 'Radio Field',
			steps: [
				{
					id: 'step-1',
					title: 'Choose One',
					elements: [
						{
							$type: 'radio',
							id: 'plan',
							name: 'plan',
							label: 'Choose your plan',
							options: [
								{ value: 'free', label: 'Free' },
								{ value: 'basic', label: 'Basic' },
								{ value: 'pro', label: 'Pro' },
							],
						},
					],
				},
			],
		}),
	},
};

export const WithDescriptions: Story = {
	args: {
		config: defineStoryForm({
			id: 'radio-descriptions',
			title: 'Subscription Plan',
			steps: [
				{
					id: 'step-1',
					title: 'Select Plan',
					elements: [
						{
							$type: 'radio',
							id: 'subscription',
							name: 'subscription',
							label: 'Choose your subscription',
							description: 'Select the plan that works best for you',
							options: [
								{ value: 'starter', label: 'Starter' },
								{ value: 'professional', label: 'Professional' },
								{ value: 'enterprise', label: 'Enterprise' },
							],
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
			id: 'radio-validation',
			title: 'Survey Question',
			steps: [
				{
					id: 'step-1',
					title: 'Feedback',
					elements: [
						{
							$type: 'radio',
							id: 'satisfaction',
							name: 'satisfaction',
							label: 'How satisfied are you with our service?',
							description: 'Your feedback helps us improve',
							options: [
								{ value: 'very-satisfied', label: 'Very Satisfied' },
								{ value: 'satisfied', label: 'Satisfied' },
								{ value: 'neutral', label: 'Neutral' },
								{ value: 'dissatisfied', label: 'Dissatisfied' },
								{ value: 'very-dissatisfied', label: 'Very Dissatisfied' },
							],
							rules: [ValidationPresets.string.required('Please select an option')],
						},
						{ $type: 'submit', id: 'submit', label: 'Submit Feedback', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleRadioGroups: Story = {
	args: {
		config: defineStoryForm({
			id: 'radio-multiple-groups',
			title: 'Order Configuration',
			description: 'Customize your order',
			steps: [
				{
					id: 'step-1',
					title: 'Options',
					elements: [
						{
							$type: 'radio',
							id: 'size',
							name: 'size',
							label: 'Size',
							options: [
								{ value: 'small', label: 'Small' },
								{ value: 'medium', label: 'Medium' },
								{ value: 'large', label: 'Large' },
							],
							rules: [ValidationPresets.string.required('Please select a size')],
						},
						{
							$type: 'radio',
							id: 'color',
							name: 'color',
							label: 'Color',
							options: [
								{ value: 'black', label: 'Black' },
								{ value: 'white', label: 'White' },
								{ value: 'blue', label: 'Blue' },
							],
							rules: [ValidationPresets.string.required('Please select a color')],
						},
						{
							$type: 'radio',
							id: 'delivery',
							name: 'delivery',
							label: 'Delivery Method',
							options: [
								{ value: 'standard', label: 'Standard Shipping' },
								{ value: 'express', label: 'Express Shipping' },
								{ value: 'pickup', label: 'Store Pickup' },
							],
							rules: [ValidationPresets.string.required('Please select a delivery method')],
						},
						{ $type: 'submit', id: 'submit', label: 'Place Order', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const YesNoQuestion: Story = {
	args: {
		config: defineStoryForm({
			id: 'radio-yes-no',
			title: 'Quick Question',
			steps: [
				{
					id: 'step-1',
					title: 'Confirmation',
					elements: [
						{
							$type: 'radio',
							id: 'subscribe',
							name: 'subscribe',
							label: 'Would you like to receive our newsletter?',
							options: [
								{ value: 'yes', label: 'Yes, send me updates' },
								{ value: 'no', label: 'No, thank you' },
							],
							rules: [ValidationPresets.string.required('Please make a selection')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'radio-disabled',
			title: 'Disabled Radio States',
			description: 'Examples of disabled radio buttons',
			steps: [
				{
					id: 'step-1',
					title: 'Settings',
					elements: [
						{
							$type: 'radio',
							id: 'disabledUnselected',
							name: 'disabledUnselected',
							label: 'Disabled (no selection)',
							options: [
								{ value: 'option1', label: 'Option 1' },
								{ value: 'option2', label: 'Option 2' },
								{ value: 'option3', label: 'Option 3' },
							],
							disabled: true,
						},
						{
							$type: 'radio',
							id: 'disabledSelected',
							name: 'disabledSelected',
							label: 'Disabled (with selection)',
							description: 'This option has been pre-selected',
							options: [
								{ value: 'standard', label: 'Standard' },
								{ value: 'premium', label: 'Premium' },
								{ value: 'enterprise', label: 'Enterprise' },
							],
							disabled: true,
							defaultValue: 'premium',
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
			id: 'radio-mixed',
			title: 'Mixed Radio States',
			description: 'Combination of enabled and disabled radio groups',
			steps: [
				{
					id: 'step-1',
					title: 'Subscription Options',
					elements: [
						{
							$type: 'radio',
							id: 'currentPlan',
							name: 'currentPlan',
							label: 'Current Plan',
							description: 'Your active subscription',
							options: [
								{ value: 'free', label: 'Free' },
								{ value: 'pro', label: 'Pro' },
								{ value: 'enterprise', label: 'Enterprise' },
							],
							disabled: true,
							defaultValue: 'pro',
						},
						{
							$type: 'radio',
							id: 'billingCycle',
							name: 'billingCycle',
							label: 'Billing Cycle',
							options: [
								{ value: 'monthly', label: 'Monthly' },
								{ value: 'yearly', label: 'Yearly (Save 20%)' },
							],
							rules: [ValidationPresets.string.required('Please select a billing cycle')],
						},
						{ $type: 'submit', id: 'submit', label: 'Update Settings', name: 'submit' },
					],
				},
			],
		}),
	},
};
