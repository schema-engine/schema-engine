import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';
import { clickSubmit, expectFieldError, playClearSelection, playSelectOption } from '@/stories/shared/play';

const programmingLanguages = [
	{ value: 'js', label: 'JavaScript' },
	{ value: 'ts', label: 'TypeScript' },
	{ value: 'py', label: 'Python' },
	{ value: 'go', label: 'Go' },
	{ value: 'rs', label: 'Rust' },
];

const meta = {
	...formRendererMeta,
	title: 'Elements/Inputs/Combobox',
	args: {
		config: fieldFormConfig('combobox-default', 'Combobox', [
			{
				$type: 'combobox',
				id: 'language',
				name: 'language',
				label: 'Programming Language',
				placeholder: 'Search languages',
				options: programmingLanguages,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Combobox opens and chooses an option', async () => {
			const canvas = within(canvasElement);
			await expect(canvas.getByRole('combobox', { name: /programming language/i })).toBeInTheDocument();
			await playSelectOption(canvasElement, /programming language/i, /javascript/i);
			await expect(canvas.getByRole('combobox', { name: /programming language/i })).toHaveValue('JavaScript');
		});
	},
};

export const Clearable: Story = {
	args: {
		config: fieldFormConfig('combobox-clearable', 'Combobox', [
			{
				$type: 'combobox',
				id: 'language',
				name: 'language',
				label: 'Programming Language',
				placeholder: 'Search languages',
				description: 'Optional — click the clear control to remove the selection.',
				defaultValue: 'ts',
				options: programmingLanguages,
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		await step('Starts selected and clears with the X control', async () => {
			const input = within(canvasElement).getByRole('combobox', { name: /programming language/i });
			await expect(input).toHaveValue('TypeScript');
			await playClearSelection(canvasElement);
			await expect(input).toHaveValue('');
		});
	},
};

export const Multiple: Story = {
	args: {
		config: fieldFormConfig('combobox-multiple', 'Combobox', [
			{
				$type: 'combobox',
				id: 'languages',
				name: 'languages',
				label: 'Programming Languages',
				placeholder: 'Search languages',
				description: 'Search and select more than one language. Remove a chip to deselect.',
				multiple: true,
				defaultValue: ['js', 'ts'],
				options: programmingLanguages,
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		await step('Selected values render as removable chips', async () => {
			const canvas = within(canvasElement);
			await expect(canvas.getByRole('listitem', { name: /javascript/i })).toBeInTheDocument();
			await expect(canvas.getByRole('listitem', { name: /typescript/i })).toBeInTheDocument();
			await playSelectOption(canvasElement, /programming languages/i, /python/i);
			await expect(canvas.getByRole('listitem', { name: /python/i })).toBeInTheDocument();
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
				placeholder: 'Search languages',
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
