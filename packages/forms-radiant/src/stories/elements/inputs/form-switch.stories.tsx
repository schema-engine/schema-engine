import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent } from 'storybook/test';
import { getFieldControl } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Switch',
	args: {
		config: fieldFormConfig('switch-default', 'Forms/Elements/Inputs/Switch', [
			{
				$type: 'switch',
				id: 'notifications',
				name: 'notifications',
				label: 'Enable notifications',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Control is visible', async () => {
			const control = getFieldControl(canvasElement, /enable notifications/i);
			await expect(control).toBeInTheDocument();
			await userEvent.click(control);
		});
	},
};
