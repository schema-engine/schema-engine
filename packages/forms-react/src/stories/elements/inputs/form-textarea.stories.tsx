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
		adapter: { table: { disable: true } },
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
		config: createForm()
			.setId('textarea-default')
			.setTitle('Textarea Field')
			.addStep({ id: 'step-1', title: 'Message' })
			.addElement('textarea', {
				id: 'message',
				name: 'message',
				label: 'Your Message',
				placeholder: 'Enter your message here...',
				rows: 4,
			})
			.build(),
	},
};

export const SmallTextarea: Story = {
	args: {
		config: createForm()
			.setId('textarea-small')
			.setTitle('Small Textarea')
			.addStep({ id: 'step-1', title: 'Comment' })
			.addElement('textarea', {
				id: 'comment',
				name: 'comment',
				label: 'Comment',
				placeholder: 'Add a comment...',
				rows: 2,
			})
			.build(),
	},
};

export const LargeTextarea: Story = {
	args: {
		config: createForm()
			.setId('textarea-large')
			.setTitle('Large Textarea')
			.addStep({ id: 'step-1', title: 'Description' })
			.addElement('textarea', {
				id: 'description',
				name: 'description',
				label: 'Full Description',
				placeholder: 'Provide a detailed description...',
				rows: 8,
				description: 'Please provide as much detail as possible',
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('textarea-validation')
			.setTitle('Textarea with Validation')
			.addStep({ id: 'step-1', title: 'Feedback Form' })
			.addElement('textarea', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Submit Feedback', name: 'submit' })
			.build(),
	},
};

export const MultipleTextareas: Story = {
	args: {
		config: createForm()
			.setId('textarea-multiple')
			.setTitle('Application Form')
			.setDescription('Tell us about yourself')
			.addStep({ id: 'step-1', title: 'Personal Statement' })
			.addElement('textarea', {
				id: 'bio',
				name: 'bio',
				label: 'Short Bio',
				placeholder: 'Tell us about yourself in a few sentences...',
				rows: 3,
				rules: [ValidationPresets.string.required(), ValidationPresets.string.maxLength(200)],
			})
			.addElement('textarea', {
				id: 'experience',
				name: 'experience',
				label: 'Relevant Experience',
				placeholder: 'Describe your relevant experience...',
				rows: 5,
				rules: [ValidationPresets.string.required()],
			})
			.addElement('textarea', {
				id: 'motivation',
				name: 'motivation',
				label: 'Why are you interested?',
				placeholder: 'Tell us why you want to join...',
				rows: 4,
			})
			.addElement('submit', { id: 'submit', label: 'Submit Application', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('textarea-disabled')
			.setTitle('Disabled Textarea States')
			.setDescription('Examples of disabled textareas')
			.addStep({ id: 'step-1', title: 'Information' })
			.addElement('textarea', {
				id: 'disabledEmpty',
				name: 'disabledEmpty',
				label: 'Disabled empty textarea',
				placeholder: 'Cannot edit this field',
				rows: 3,
				disabled: true,
			})
			.addElement('textarea', {
				id: 'disabledWithContent',
				name: 'disabledWithContent',
				label: 'Disabled with content',
				rows: 4,
				disabled: true,
				defaultValue:
					'This is read-only content that cannot be modified. It might contain important information that should be visible but not editable.',
				description: 'This content is locked',
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('textarea-mixed')
			.setTitle('Mixed Textarea States')
			.setDescription('Combination of enabled and disabled textareas')
			.addStep({ id: 'step-1', title: 'Review and Edit' })
			.addElement('textarea', {
				id: 'systemMessage',
				name: 'systemMessage',
				label: 'System Message',
				rows: 2,
				disabled: true,
				defaultValue: 'This is an automatically generated message that cannot be edited.',
				description: 'Auto-generated content',
			})
			.addElement('textarea', {
				id: 'userComment',
				name: 'userComment',
				label: 'Your Comments',
				placeholder: 'Add your comments here...',
				rows: 4,
				rules: [ValidationPresets.string.required('Please add your comments')],
			})
			.addElement('textarea', {
				id: 'additionalNotes',
				name: 'additionalNotes',
				label: 'Additional Notes',
				placeholder: 'Any additional information...',
				rows: 3,
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};
