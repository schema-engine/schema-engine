import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createDefaultFieldPlay, createValidationFieldPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('textarea-default', 'Forms/Elements/Inputs/Textarea', [
			{
				$type: 'textarea',
				id: 'message',
				name: 'message',
				label: 'Message',
				placeholder: 'Type your message',
				rows: 4,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: createDefaultFieldPlay(/message/i, 'Hello world'),
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('textarea-validation', 'Forms/Elements/Inputs/Textarea', [
			{
				$type: 'textarea',
				id: 'message',
				name: 'message',
				label: 'Message',
				rows: 4,
				rules: [
					{
						type: 'required',
						message: 'Message is required',
					},
				],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: createValidationFieldPlay(/message/i, 'Hello there', /submit/i, /message is required/i),
};
