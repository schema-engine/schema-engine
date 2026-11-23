import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, waitFor, within } from 'storybook/test';
import { clickSubmit, playFieldFocusAndType } from '@/stories/shared/play';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('submission-alert-default', 'Submission Alert', [
			{
				$type: 'input',
				id: 'email',
				name: 'email',
				label: 'Email',
				inputType: 'email',
				rules: [{ $type: 'required', message: 'Email is required' }],
			},
			{ $type: 'submission-alert', id: 'alert', name: 'alert', successMessage: 'Saved successfully' },
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Save' },
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Successful submit shows alert', async () => {
			await playFieldFocusAndType(canvasElement, /email/i, 'user@example.com');
			await clickSubmit(canvasElement, /save/i);
			await waitFor(async () => {
				await expect(within(canvasElement).getByText(/saved successfully/i)).toBeInTheDocument();
			});
		});
	},
};
