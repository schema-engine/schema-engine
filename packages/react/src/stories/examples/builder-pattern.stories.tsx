/**
 * Example Story Using New Builder Pattern
 *
 * This is a complete example showing how to create Storybook stories
 * using the new FormEngine builder pattern.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryWrapper } from '../shared/story-wrapper';
import { FormRenderer } from '@/components/internals/form-renderer';
import type { FormConfig } from '@json-form-engine/core/schemas';
import { ValidationPresets } from '@json-form-engine/core/schemas/validation';

const simpleForm: FormConfig = {
	id: 'simple-example',
	title: 'Simple Contact Form',
	description: 'Example using the new builder pattern',
	mode: 'free',
	steps: [
		{
			id: 'contact',
			title: 'Contact Information',
			elements: [
				{
					__id: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your name',
					rules: [ValidationPresets.string.minLength(2, 'Name must be at least 2 characters')],
				},
				{
					__id: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email',
					placeholder: 'your.email@example.com',
					rules: [ValidationPresets.string.email('Please enter a valid email')],
				},
			],
		},
	],
};

const formWithCardLayout: FormConfig = {
	...simpleForm,
	id: 'card-layout-example',
	steps: [
		{
			...simpleForm.steps[0],
			layout: {
				id: 'card',
				maxWidth: 'md',
				padding: 'md',
				shadowSize: 'lg',
			},
		},
	],
};

const multiStepForm: FormConfig = {
	id: 'multi-step-example',
	title: 'Multi-Step Registration',
	description: 'Example with stepper',
	mode: 'wizard',
	steps: [
		{
			id: 'step-1',
			title: 'Personal Info',
			description: 'Tell us about yourself',
			elements: [
				{
					__id: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'John',
				},
			],
		},
		{
			id: 'step-2',
			title: 'Contact Details',
			description: 'How can we reach you?',
			elements: [
				{
					__id: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email',
					placeholder: 'john@example.com',
				},
			],
		},
		{
			id: 'step-3',
			title: 'Review',
			description: 'Please review your information',
			elements: [],
		},
	],
	stepper: {
		id: 'default',
		showStepNumbers: true,
		showStepTitles: true,
	} as any,
};

const meta = {
	title: 'Examples/Builder Pattern',
	component: FormRenderer,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Examples showing the new FormEngine builder pattern. All stories are wrapped with StoryWrapper which provides the FormEngineProvider.',
			},
		},
	},
	decorators: [
		(Story) => (
			<div style={{ padding: '2rem', minHeight: '100vh', background: '#f5f5f5' }}>
				<StoryWrapper>
					<Story />
				</StoryWrapper>
			</div>
		),
	],
	tags: ['autodocs'],
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic form with just input fields
 */
export const SimpleForm: Story = {
	args: {
		config: simpleForm,
	},
};

/**
 * Form wrapped in a card layout
 */
export const WithCardLayout: Story = {
	args: {
		config: formWithCardLayout,
	},
};

/**
 * Multi-step form with default stepper
 */
export const MultiStepForm: Story = {
	args: {
		config: multiStepForm,
	},
};

/**
 * Multi-step form with vertical stepper
 */
export const WithVerticalStepper: Story = {
	args: {
		config: {
			...multiStepForm,
			stepper: {
				id: 'vertical',
				showConnectors: true,
			} as any,
		},
	},
};

/**
 * Multi-step form with minimalist stepper
 */
export const WithMinimalistStepper: Story = {
	args: {
		config: {
			...multiStepForm,
			stepper: {
				id: 'minimalist',
				showProgress: true,
			} as any,
		},
	},
};

/**
 * Form with split-screen layout
 */
export const WithSplitScreenLayout: Story = {
	args: {
		config: {
			...simpleForm,
			id: 'split-screen-example',
			steps: [
				{
					...simpleForm.steps[0],
					layout: {
						id: 'split-screen',
						sideContent: '<h3>Welcome!</h3><p>Please fill out the form to continue.</p>',
						sidePlacement: 'left',
						sideWidth: 'normal',
					},
				},
			],
		},
	},
};

/**
 * Form with hero background layout
 */
export const WithHeroBackgroundLayout: Story = {
	args: {
		config: {
			...simpleForm,
			id: 'hero-example',
			steps: [
				{
					...simpleForm.steps[0],
					layout: {
						id: 'hero-background',
						backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920',
						contentWidth: 'md',
					},
				},
			],
		},
	},
};
