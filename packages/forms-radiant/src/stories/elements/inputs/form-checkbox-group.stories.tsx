import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';
import { playCheckboxByLabel } from '@/stories/shared/play';
import { createValidationFieldPlay } from '@/stories/shared/field-plays';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

const interests = [
	{ label: 'Design', value: 'design' },
	{ label: 'Engineering', value: 'engineering' },
	{ label: 'Product', value: 'product' },
];

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('checkbox-group-default', 'Select options', [
			{
				$type: 'checkbox-group',
				id: 'interests',
				name: 'interests',
				label: 'Interests',
				options: interests,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Checkbox group is visible', async () => {
			await expect(within(canvasElement).getByText(/interests/i)).toBeInTheDocument();
			await expect(within(canvasElement).getByRole('checkbox', { name: /design/i })).toBeInTheDocument();
		});
	},
};

export const Horizontal: Story = {
	args: {
		config: fieldFormConfig('checkbox-group-horizontal', 'Select options', [
			{
				$type: 'checkbox-group',
				id: 'interests',
				name: 'interests',
				label: 'Interests',
				orientation: 'horizontal',
				options: interests,
			},
		]),
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
				rules: [{ $type: 'required', message: 'Select at least one skill' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Save' },
		]),
	},
	play: createValidationFieldPlay(/react/i, 'react', /save/i, /select at least one skill/i, (canvasElement) =>
		playCheckboxByLabel(canvasElement, /react/i),
	),
};
