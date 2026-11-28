import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story.js';
import { expect, within } from 'storybook/test';
import { clickSubmit } from '@/stories/shared/play.js';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr.js';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('input-otp-default', 'Verification Code', [
			{
				$type: 'input-otp',
				id: 'otp',
				name: 'otp',
				label: 'Verification Code',
				length: 6,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('OTP field is visible', async () => {
			await expect(within(canvasElement).getByText(/verification code/i)).toBeInTheDocument();
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('input-otp-validation', 'Verification Code', [
			{
				$type: 'input-otp',
				id: 'otp',
				name: 'otp',
				label: 'Verification Code',
				length: 6,
				rules: [{ $type: 'required', message: 'Code is required' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Verify' },
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Submit triggers validation flow', async () => {
			await clickSubmit(canvasElement, /verify/i);
			await expect(within(canvasElement).getByText(/verification code/i)).toBeInTheDocument();
		});
	},
};
