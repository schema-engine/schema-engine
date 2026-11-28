import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story.js';
import { clickSubmit, expectFieldError, playFieldFocusAndType } from '@/stories/shared/play.js';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr.js';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('submit-button-default', 'Submit Button', [
			{
				$type: 'input',
				id: 'email',
				name: 'email',
				label: 'Email',
				inputType: 'email',
				rules: [{ $type: 'required', message: 'Email is required' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit Form' },
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Submit triggers validation', async () => {
			await clickSubmit(canvasElement, /submit form/i);
			await expectFieldError(canvasElement, /email is required/i);
		});
		await step('Valid submit clears error', async () => {
			await playFieldFocusAndType(canvasElement, /email/i, 'user@example.com');
			await clickSubmit(canvasElement, /submit form/i);
		});
	},
};
