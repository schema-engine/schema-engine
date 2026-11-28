import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer.js';
import { StoryWrapper } from '@/stories/shared/story-wrapper.js';
import { defineStoryForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui.js';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	args: {
		engine: baseUIEngine,
	},
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Searchable combobox element for choosing single or multiple options with filtering support. Includes chips display for multiple selections, validation, and checkmark indicators. Base UI implementation.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={baseUIEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	argTypes: {
		engine: { table: { disable: true } },
		config: {
			control: 'object',
			description: 'Form configuration with combobox element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const programmingLanguages = [
	{ value: 'js', label: 'JavaScript' },
	{ value: 'ts', label: 'TypeScript' },
	{ value: 'py', label: 'Python' },
	{ value: 'java', label: 'Java' },
	{ value: 'cpp', label: 'C++' },
	{ value: 'cs', label: 'C#' },
	{ value: 'php', label: 'PHP' },
	{ value: 'ruby', label: 'Ruby' },
	{ value: 'go', label: 'Go' },
	{ value: 'rust', label: 'Rust' },
	{ value: 'swift', label: 'Swift' },
];

export const Single: Story = {
	args: {
		config: defineStoryForm({
			id: 'combobox-single',
			title: 'Combobox - Single Selection',
			steps: [
				{
					id: 'step-1',
					title: 'Choose Language',
					elements: [
						{
							$type: 'combobox',
							id: 'language',
							name: 'language',
							label: 'Programming Language',
							description: 'Search and select a programming language',
							options: programmingLanguages,
						},
					],
				},
			],
		}),
	},
};

export const Multiple: Story = {
	args: {
		config: defineStoryForm({
			id: 'combobox-multiple',
			title: 'Combobox - Multiple Selection',
			steps: [
				{
					id: 'step-1',
					title: 'Choose Languages',
					elements: [
						{
							$type: 'combobox',
							id: 'languages',
							name: 'languages',
							label: 'Programming Languages',
							description: 'Search and select multiple languages with searchable chips',
							options: programmingLanguages,
							multiple: true,
						},
					],
				},
			],
		}),
	},
};

export const WithValidation: Story = {
	args: {
		config: defineStoryForm({
			id: 'combobox-validation',
			title: 'Combobox with Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Required Selection',
					elements: [
						{
							$type: 'combobox',
							id: 'language',
							name: 'language',
							label: 'Favorite Language',
							description: 'Choose your favorite programming language',
							options: programmingLanguages,
							rules: [ValidationPresets.string.required('Please select a language')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const WithMultipleValidation: Story = {
	args: {
		config: defineStoryForm({
			id: 'combobox-validation',
			title: 'Combobox with Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Required Selection',
					elements: [
						{
							$type: 'combobox',
							id: 'language',
							name: 'language',
							label: 'Favorite Language',
							description: 'Choose your favorite programming language',
							options: programmingLanguages,
							multiple: true,
							rules: [ValidationPresets.string.required('Please select a language')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};
