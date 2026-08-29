import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createDefaultFieldPlay } from '@/stories/shared/field-plays';
import { clickSubmit, expectFieldError } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Elements/Inputs/Number',
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
						type: 'min',
						value: 2,
						message: 'Quantity must be at least 2',
					},
				],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: async ({ canvasElement, step }) => {
		await step('Empty submit shows validation error', async () => {
			await clickSubmit(canvasElement, /submit/i);
			await expectFieldError(canvasElement, /quantity must be at least 2/i);
		});
	},
};
