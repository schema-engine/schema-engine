import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createDefaultFieldPlay, createValidationFieldPlay } from '@/stories/shared/field-plays';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('number-default', 'Forms/Elements/Inputs/Number', [
			{
				$type: 'number',
				id: 'quantity',
				name: 'quantity',
				label: 'Quantity',
				min: 1,
				max: 10,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: createDefaultFieldPlay(/quantity/i, '3'),
};

/**
 * Empty submit surfaces the `required` message; a filled value below `min`
 * surfaces the `min` message. Mirrors the React adapter contract.
 */
export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('number-validation', 'Forms/Elements/Inputs/Number', [
			{
				$type: 'number',
				id: 'quantity',
				name: 'quantity',
				label: 'Quantity',
				rules: [
					{
						type: 'required',
						message: 'Quantity is required',
					},
					{
						type: 'min',
						value: 2,
						message: 'Quantity must be at least 2',
					},
				],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: createValidationFieldPlay(/quantity/i, '3', /submit/i, /quantity is required|quantity must be at least 2/i),
};
