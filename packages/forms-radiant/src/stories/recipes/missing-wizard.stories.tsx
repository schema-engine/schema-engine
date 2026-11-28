import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { createFormEngine } from '@schema-engine/forms';
import { schemaFormRegistrations } from '@/registrations/index.js';
import { formRendererMeta, renderFormStory } from '@/stories/shared/form-story.js';
import { getFieldControl, getSubmitButton } from '@/stories/shared/play.js';
import { expect, waitFor } from 'storybook/test';
import type { StoryContext } from 'storybook/internal/types';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr.js';

const noRecipeEngine = createFormEngine({ elements: schemaFormRegistrations });

const meta = {
	...formRendererMeta,
	title: 'Recipes/Missing wizard fallback',
	render: (args) => renderFormStory({ ...args, engine: noRecipeEngine }),
	args: {
		config: {
			id: 'missing-wizard',
			title: 'Missing wizard fallback',
			steps: [
				{
					id: 'one',
					title: 'One',
					elements: [
						{
							$type: 'input',
							id: 'first-name',
							name: 'firstName',
							label: 'First name',
							placeholder: 'Jane',
							inputType: 'text',
						},
					],
				},
				{
					id: 'two',
					title: 'Two',
					elements: [
						{
							$type: 'input',
							id: 'last-name',
							name: 'lastName',
							label: 'Last name',
							placeholder: 'Doe',
							inputType: 'text',
						},
						{ $type: 'submit', id: 'submit', name: 'submit', label: 'Send' },
					],
				},
			],
		},
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePageFallback: Story = {
	play: async ({ canvasElement, step }: StoryContext) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Every step is visible without wizard navigation', async () => {
			await waitFor(async () => {
				await expect(getFieldControl(canvasElement, /first name/i)).toBeTruthy();
				await expect(getFieldControl(canvasElement, /last name/i)).toBeTruthy();
				await expect(getSubmitButton(canvasElement, /send/i)).toBeTruthy();
			});
		});
	},
};
