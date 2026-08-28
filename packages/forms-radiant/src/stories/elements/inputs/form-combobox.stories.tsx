import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';
import { clickSubmit, expectFieldError } from '@/stories/shared/play';

const programmingLanguages = [
	{ value: 'js', label: 'JavaScript' },
	{ value: 'ts', label: 'TypeScript' },
	{ value: 'py', label: 'Python' },
];

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Combobox',
	args: {
		config: fieldFormConfig('combobox-default', 'Combobox', [
			{
				$type: 'combobox',
				id: 'language',
				name: 'language',
				label: 'Programming Language',
				options: programmingLanguages,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Combobox label is visible', async () => {
			await expect(within(canvasElement).getByText(/programming language/i)).toBeInTheDocument();
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('combobox-validation', 'Combobox with Validation', [
			{
				$type: 'combobox',
				id: 'language',
				name: 'language',
				label: 'Favorite Language',
				options: programmingLanguages,
				rules: [{ type: 'required', message: 'Please select a language' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Continue' },
		]),
	},
	play: async ({ canvasElement, step }) => {
		await step('Empty submit shows validation error', async () => {
			await clickSubmit(canvasElement, /continue/i);
			await expectFieldError(canvasElement, /please select a language/i);
		});
	},
};
