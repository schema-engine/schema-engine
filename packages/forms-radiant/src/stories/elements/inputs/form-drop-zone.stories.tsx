import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story.js';
import { expect, within } from 'storybook/test';
import { clickSubmit } from '@/stories/shared/play.js';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr.js';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('dropzone-default', 'File Upload', [
			{
				$type: 'drop-zone',
				id: 'file',
				name: 'file',
				label: 'Upload Document',
				maxFiles: 1,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Drop zone is visible', async () => {
			await expect(within(canvasElement).getByText(/upload document/i)).toBeInTheDocument();
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('dropzone-validation', 'Required Upload', [
			{
				$type: 'drop-zone',
				id: 'files',
				name: 'files',
				label: 'Upload Documents',
				maxFiles: 1,
				rules: [{ $type: 'required', message: 'Upload at least one document' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Submit triggers validation flow', async () => {
			await clickSubmit(canvasElement, /submit/i);
			await expect(within(canvasElement).getByText(/upload documents/i)).toBeInTheDocument();
		});
	},
};
