import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createValidationFieldPlay } from '@/stories/shared/field-plays';
import { expect, within } from 'storybook/test';
import { playSelectOption } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Select',
	args: {
		config: fieldFormConfig('select-default', 'Forms/Elements/Inputs/Select', [
			{
				$type: 'select',
				id: 'country',
				name: 'country',
				label: 'Country',
				options: [
					{
						label: 'USA',
						value: 'us',
					},
					{
						label: 'Canada',
						value: 'ca',
					},
				],
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Select opens and chooses an option', async () => {
			await expect(within(canvasElement).getByRole('combobox', { name: /country/i })).toBeInTheDocument();
			await playSelectOption(canvasElement, /country/i, /usa/i);
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('select-validation', 'Forms/Elements/Inputs/Select', [
			{
				$type: 'select',
				id: 'country',
				name: 'country',
				label: 'Country',
				options: [
					{
						label: 'USA',
						value: 'us',
					},
				],
				rules: [
					{
						type: 'required',
						message: 'Country is required',
					},
				],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: createValidationFieldPlay(/country/i, 'us', /submit/i, /country is required/i, (canvasElement) =>
		playSelectOption(canvasElement, /country/i, /usa/i),
	),
};
