import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { defineStoryForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui';

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
					'Multi-line textarea element for longer text input with configurable rows and validation rules including length constraints. Base UI implementation.',
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
			description: 'Form configuration with textarea element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'textarea-default',
			title: 'Textarea Field',
			steps: [
				{
					id: 'step-1',
					title: 'Message',
					elements: [
						{
							$type: 'textarea',
							id: 'message',
							name: 'message',
							label: 'Your Message',
							placeholder: 'Enter your message here...',
							rows: 4,
						},
					],
				},
			],
		}),
	},
};

export const SmallTextarea: Story = {
	args: {
		config: defineStoryForm({
			id: 'textarea-small',
			title: 'Small Textarea',
			steps: [
				{
					id: 'step-1',
					title: 'Comment',
					elements: [
						{
							$type: 'textarea',
							id: 'comment',
							name: 'comment',
							label: 'Comment',
							placeholder: 'Add a comment...',
							rows: 2,
						},
					],
				},
			],
		}),
	},
};

export const LargeTextarea: Story = {
	args: {
		config: defineStoryForm({
			id: 'textarea-large',
			title: 'Large Textarea',
			steps: [
				{
					id: 'step-1',
					title: 'Description',
					elements: [
						{
							$type: 'textarea',
							id: 'description',
							name: 'description',
							label: 'Full Description',
							placeholder: 'Provide a detailed description...',
							rows: 8,
							description: 'Please provide as much detail as possible',
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
			id: 'textarea-validation',
			title: 'Textarea with Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Feedback Form',
					elements: [
						{
							$type: 'textarea',
							id: 'feedback',
							name: 'feedback',
							label: 'Your Feedback',
							placeholder: 'Tell us what you think...',
							rows: 5,
							rules: [
								ValidationPresets.string.required('Feedback is required'),
								ValidationPresets.string.minLength(10, 'Feedback must be at least 10 characters'),
								ValidationPresets.string.maxLength(500, 'Feedback must not exceed 500 characters'),
							],
						},
						{ $type: 'submit', id: 'submit', label: 'Submit Feedback', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleTextareas: Story = {
	args: {
		config: defineStoryForm({
			id: 'textarea-multiple',
			title: 'Application Form',
			description: 'Tell us about yourself',
			steps: [
				{
					id: 'step-1',
					title: 'Personal Statement',
					elements: [
						{
							$type: 'textarea',
							id: 'bio',
							name: 'bio',
							label: 'Short Bio',
							placeholder: 'Tell us about yourself in a few sentences...',
							rows: 3,
							rules: [ValidationPresets.string.required(), ValidationPresets.string.maxLength(200)],
						},
						{
							$type: 'textarea',
							id: 'experience',
							name: 'experience',
							label: 'Relevant Experience',
							placeholder: 'Describe your relevant experience...',
							rows: 5,
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'textarea',
							id: 'motivation',
							name: 'motivation',
							label: 'Why are you interested?',
							placeholder: 'Tell us why you want to join...',
							rows: 4,
						},
						{ $type: 'submit', id: 'submit', label: 'Submit Application', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'textarea-disabled',
			title: 'Disabled Textarea States',
			description: 'Examples of disabled textareas',
			steps: [
				{
					id: 'step-1',
					title: 'Information',
					elements: [
						{
							$type: 'textarea',
							id: 'disabledEmpty',
							name: 'disabledEmpty',
							label: 'Disabled empty textarea',
							placeholder: 'Cannot edit this field',
							rows: 3,
							disabled: true,
						},
						{
							$type: 'textarea',
							id: 'disabledWithContent',
							name: 'disabledWithContent',
							label: 'Disabled with content',
							rows: 4,
							disabled: true,
							defaultValue:
								'This is read-only content that cannot be modified. It might contain important information that should be visible but not editable.',
							description: 'This content is locked',
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
			id: 'textarea-mixed',
			title: 'Mixed Textarea States',
			description: 'Combination of enabled and disabled textareas',
			steps: [
				{
					id: 'step-1',
					title: 'Review and Edit',
					elements: [
						{
							$type: 'textarea',
							id: 'systemMessage',
							name: 'systemMessage',
							label: 'System Message',
							rows: 2,
							disabled: true,
							defaultValue: 'This is an automatically generated message that cannot be edited.',
							description: 'Auto-generated content',
						},
						{
							$type: 'textarea',
							id: 'userComment',
							name: 'userComment',
							label: 'Your Comments',
							placeholder: 'Add your comments here...',
							rows: 4,
							rules: [ValidationPresets.string.required('Please add your comments')],
						},
						{
							$type: 'textarea',
							id: 'additionalNotes',
							name: 'additionalNotes',
							label: 'Additional Notes',
							placeholder: 'Any additional information...',
							rows: 3,
						},
						{ $type: 'submit', id: 'submit', label: 'Submit', name: 'submit' },
					],
				},
			],
		}),
	},
};
