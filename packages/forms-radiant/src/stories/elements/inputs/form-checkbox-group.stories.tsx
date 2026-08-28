import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';
import { clickSubmit, expectFieldError } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Checkbox Group',
	args: {
		config: fieldFormConfig('checkbox-group-default', 'Select options', [
			{
				$type: 'checkbox-group',
				id: 'interests',
				name: 'interests',
				label: 'Interests',
				options: [
					{ label: 'Design', value: 'design' },
					{ label: 'Engineering', value: 'engineering' },
				],
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Checkbox group is visible', async () => {
			await expect(within(canvasElement).getByText(/interests/i)).toBeInTheDocument();
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('checkbox-group-validation', 'Select options', [
			{
				$type: 'checkbox-group',
				id: 'skills',
				name: 'skills',
				label: 'Skills',
				options: [{ label: 'React', value: 'react' }],
				rules: [{ type: 'required', message: 'Select at least one skill' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Save' },
		]),
	},
	play: async ({ canvasElement, step }) => {
		await step('Empty submit shows validation error', async () => {
			await clickSubmit(canvasElement, /save/i);
			await expectFieldError(canvasElement, /select at least one skill/i);
		});
	},
};
