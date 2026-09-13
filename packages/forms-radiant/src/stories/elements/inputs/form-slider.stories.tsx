import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent, within } from 'storybook/test';
import { clickSubmit, getFieldControl } from '@/stories/shared/play';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('slider-default', 'Slider Field', [
			{
				$type: 'slider',
				id: 'volume',
				name: 'volume',
				label: 'Volume',
				min: 0,
				max: 100,
				step: 1,
				description: 'Adjust volume from 0 to 100',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Slider control is visible', async () => {
			const control = getFieldControl(canvasElement, /volume/i);
			await expect(control).toBeInTheDocument();
			await userEvent.click(control);
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('slider-validation', 'Age Slider', [
			{
				$type: 'slider',
				id: 'age',
				name: 'age',
				label: 'Age',
				min: 18,
				max: 65,
				step: 1,
				rules: [{ type: 'min', value: 25, message: 'You must be at least 25' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Confirm Age' },
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Submit triggers validation flow', async () => {
			await clickSubmit(canvasElement, /confirm age/i);
			await expect(within(canvasElement).getByRole('slider')).toBeInTheDocument();
		});
	},
};
