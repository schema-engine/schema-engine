import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createValidationFieldPlay } from '@/stories/shared/field-plays';
import { expect, within } from 'storybook/test';
import { playClearSelection, playSelectOption } from '@/stories/shared/play';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

const languages = [
	{ label: 'JavaScript', value: 'js' },
	{ label: 'TypeScript', value: 'ts' },
	{ label: 'Python', value: 'py' },
	{ label: 'Go', value: 'go' },
	{ label: 'Rust', value: 'rs' },
];

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('select-default', 'Select', [
			{
				$type: 'select',
				id: 'language',
				name: 'language',
				label: 'Programming Language',
				placeholder: 'Select a language',
				options: languages,
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Select opens and chooses an option', async () => {
			await expect(
				within(canvasElement).getByRole('combobox', { name: /programming language/i }),
			).toBeInTheDocument();
			await playSelectOption(canvasElement, /programming language/i, /javascript/i);
		});
	},
};

export const Clearable: Story = {
	args: {
		config: fieldFormConfig('select-clearable', 'Select', [
			{
				$type: 'select',
				id: 'language',
				name: 'language',
				label: 'Programming Language',
				placeholder: 'Select a language',
				description: 'Optional — click the clear control to remove the selection.',
				defaultValue: 'ts',
				options: languages,
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Starts with a selection and clears with the X control', async () => {
			await expect(
				within(canvasElement).getByRole('combobox', { name: /programming language/i }),
			).toHaveTextContent(/typescript/i);
			await playClearSelection(canvasElement);
			await expect(
				within(canvasElement).getByRole('combobox', { name: /programming language/i }),
			).toHaveTextContent(/select a language/i);
		});
	},
};

export const Multiple: Story = {
	args: {
		config: fieldFormConfig('select-multiple', 'Select', [
			{
				$type: 'select',
				id: 'languages',
				name: 'languages',
				label: 'Languages',
				placeholder: 'Select languages',
				description: 'Choose one or more languages. Remove a chip to deselect.',
				multiple: true,
				defaultValue: ['js', 'ts'],
				options: languages,
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Selected values render as removable chips', async () => {
			const canvas = within(canvasElement);
			await expect(canvas.getByRole('listitem', { name: /javascript/i })).toBeInTheDocument();
			await expect(canvas.getByRole('listitem', { name: /typescript/i })).toBeInTheDocument();
			await playSelectOption(canvasElement, /languages/i, /python/i);
			await expect(canvas.getByRole('listitem', { name: /python/i })).toBeInTheDocument();
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('select-validation', 'Select with Validation', [
			{
				$type: 'select',
				id: 'language',
				name: 'language',
				label: 'Favorite Language',
				placeholder: 'Select a language',
				options: languages,
				rules: [{ $type: 'required', message: 'Language is required' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: createValidationFieldPlay(/favorite language/i, 'js', /submit/i, /language is required/i, (canvasElement) =>
		playSelectOption(canvasElement, /favorite language/i, /javascript/i),
	),
};
