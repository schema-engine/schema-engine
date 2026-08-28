import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent } from 'storybook/test';
import { getFieldControl } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Radio',
	args: {
		config: fieldFormConfig('radio-default', 'Forms/Elements/Inputs/Radio', [
			{
				$type: 'radio',
				id: 'plan',
				name: 'plan',
				label: 'Plan',
				options: [
					{
						label: 'Basic',
						value: 'basic',
					},
					{
						label: 'Pro',
						value: 'pro',
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
		await step('Control is visible', async () => {
			const control = getFieldControl(canvasElement, /basic/i);
			await expect(control).toBeInTheDocument();
			await userEvent.click(control);
		});
	},
};
