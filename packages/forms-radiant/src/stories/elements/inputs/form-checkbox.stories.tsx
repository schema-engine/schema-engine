import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story.js';
import { expect, userEvent } from 'storybook/test';
import { getFieldControl } from '@/stories/shared/play.js';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr.js';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('checkbox-default', 'Forms/Elements/Inputs/Checkbox', [
			{
				$type: 'checkbox',
				id: 'terms',
				name: 'terms',
				label: 'Accept terms',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Control is visible', async () => {
			const control = getFieldControl(canvasElement, /accept terms/i);
			await expect(control).toBeInTheDocument();
			await userEvent.click(control);
		});
	},
};
