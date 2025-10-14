import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { createForm, ValidationPresets } from '../shared/form-builder';

const meta = {
	title: 'Elements/Inputs/FormRadio',
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Radio button element for single-choice selections from a list of mutually exclusive options with validation support.',
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
			description: 'Form configuration with radio element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('radio-default')
			.setTitle('Radio Field')
			.addStep({ id: 'step-1', title: 'Choose One' })
			.addElement('radio', {
				id: 'plan',
				name: 'plan',
				label: 'Choose your plan',
				options: [
					{ value: 'free', label: 'Free' },
					{ value: 'basic', label: 'Basic' },
					{ value: 'pro', label: 'Pro' },
				],
			})
			.build(),
	},
};

export const WithDescriptions: Story = {
	args: {
		config: createForm()
			.setId('radio-descriptions')
			.setTitle('Subscription Plan')
			.addStep({ id: 'step-1', title: 'Select Plan' })
			.addElement('radio', {
				id: 'subscription',
				name: 'subscription',
				label: 'Choose your subscription',
				description: 'Select the plan that works best for you',
				options: [
					{ value: 'starter', label: 'Starter' },
					{ value: 'professional', label: 'Professional' },
					{ value: 'enterprise', label: 'Enterprise' },
				],
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('radio-validation')
			.setTitle('Survey Question')
			.addStep({ id: 'step-1', title: 'Feedback' })
			.addElement('radio', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Submit Feedback', name: 'submit' })
			.build(),
	},
};

export const MultipleRadioGroups: Story = {
	args: {
		config: createForm()
			.setId('radio-multiple-groups')
			.setTitle('Order Configuration')
			.setDescription('Customize your order')
			.addStep({ id: 'step-1', title: 'Options' })
			.addElement('radio', {
				id: 'size',
				name: 'size',
				label: 'Size',
				options: [
					{ value: 'small', label: 'Small' },
					{ value: 'medium', label: 'Medium' },
					{ value: 'large', label: 'Large' },
				],
				rules: [ValidationPresets.string.required('Please select a size')],
			})
			.addElement('radio', {
				id: 'color',
				name: 'color',
				label: 'Color',
				options: [
					{ value: 'black', label: 'Black' },
					{ value: 'white', label: 'White' },
					{ value: 'blue', label: 'Blue' },
				],
				rules: [ValidationPresets.string.required('Please select a color')],
			})
			.addElement('radio', {
				id: 'delivery',
				name: 'delivery',
				label: 'Delivery Method',
				options: [
					{ value: 'standard', label: 'Standard Shipping' },
					{ value: 'express', label: 'Express Shipping' },
					{ value: 'pickup', label: 'Store Pickup' },
				],
				rules: [ValidationPresets.string.required('Please select a delivery method')],
			})
			.addElement('submit', { id: 'submit', label: 'Place Order', name: 'submit' })
			.build(),
	},
};

export const YesNoQuestion: Story = {
	args: {
		config: createForm()
			.setId('radio-yes-no')
			.setTitle('Quick Question')
			.addStep({ id: 'step-1', title: 'Confirmation' })
			.addElement('radio', {
				id: 'subscribe',
				name: 'subscribe',
				label: 'Would you like to receive our newsletter?',
				options: [
					{ value: 'yes', label: 'Yes, send me updates' },
					{ value: 'no', label: 'No, thank you' },
				],
				rules: [ValidationPresets.string.required('Please make a selection')],
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('radio-disabled')
			.setTitle('Disabled Radio States')
			.setDescription('Examples of disabled radio buttons')
			.addStep({ id: 'step-1', title: 'Settings' })
			.addElement('radio', {
				id: 'disabledUnselected',
				name: 'disabledUnselected',
				label: 'Disabled (no selection)',
				options: [
					{ value: 'option1', label: 'Option 1' },
					{ value: 'option2', label: 'Option 2' },
					{ value: 'option3', label: 'Option 3' },
				],
				disabled: true,
			})
			.addElement('radio', {
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
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('radio-mixed')
			.setTitle('Mixed Radio States')
			.setDescription('Combination of enabled and disabled radio groups')
			.addStep({ id: 'step-1', title: 'Subscription Options' })
			.addElement('radio', {
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
			})
			.addElement('radio', {
				id: 'billingCycle',
				name: 'billingCycle',
				label: 'Billing Cycle',
				options: [
					{ value: 'monthly', label: 'Monthly' },
					{ value: 'yearly', label: 'Yearly (Save 20%)' },
				],
				rules: [ValidationPresets.string.required('Please select a billing cycle')],
			})
			.addElement('submit', { id: 'submit', label: 'Update Settings', name: 'submit' })
			.build(),
	},
};
