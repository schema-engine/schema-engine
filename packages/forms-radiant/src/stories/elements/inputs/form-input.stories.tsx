import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createDefaultFieldPlay, createValidationFieldPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('input-default', 'Forms/Elements/Inputs/Input', [
			{
				$type: 'input',
				id: 'text',
				name: 'text',
				label: 'Full Name',
				placeholder: 'Enter your name',
				inputType: 'text',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: createDefaultFieldPlay(/full name/i, 'Jane Doe'),
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('input-validation', 'Forms/Elements/Inputs/Input', [
			{
				$type: 'input',
				id: 'name',
				name: 'name',
				label: 'Full Name',
				placeholder: 'John Doe',
				inputType: 'text',
				rules: [
					{
						$type: 'required',
						message: 'Name is required',
					},
					{
						$type: 'minLength',
						value: 2,
						message: 'Name must be at least 2 characters',
					},
				],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: createValidationFieldPlay(/full name/i, 'Jane', /submit/i, /name is required|name must be at least/i),
};
