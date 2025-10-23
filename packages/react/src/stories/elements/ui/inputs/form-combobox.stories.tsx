import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
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
		config: createForm()
			.setId('combobox-single')
			.setTitle('Combobox - Single Selection')
			.addStep({ id: 'step-1', title: 'Choose Language' })
			.addElement('combobox', {
				id: 'language',
				name: 'language',
				label: 'Programming Language',
				description: 'Search and select a programming language',
				options: programmingLanguages,
			})
			.build(),
	},
};

export const Multiple: Story = {
	args: {
		config: createForm()
			.setId('combobox-multiple')
			.setTitle('Combobox - Multiple Selection')
			.addStep({ id: 'step-1', title: 'Choose Languages' })
			.addElement('combobox', {
				id: 'languages',
				name: 'languages',
				label: 'Programming Languages',
				description: 'Search and select multiple languages with searchable chips',
				options: programmingLanguages,
				multiple: true,
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('combobox-validation')
			.setTitle('Combobox with Validation')
			.addStep({ id: 'step-1', title: 'Required Selection' })
			.addElement('combobox', {
				id: 'language',
				name: 'language',
				label: 'Favorite Language',
				description: 'Choose your favorite programming language',
				options: programmingLanguages,
				rules: [ValidationPresets.string.required('Please select a language')],
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const WithMultipleValidation: Story = {
	args: {
		config: createForm()
			.setId('combobox-validation')
			.setTitle('Combobox with Validation')
			.addStep({ id: 'step-1', title: 'Required Selection' })
			.addElement('combobox', {
				id: 'language',
				name: 'language',
				label: 'Favorite Language',
				description: 'Choose your favorite programming language',
				options: programmingLanguages,
				multiple: true,
				rules: [ValidationPresets.string.required('Please select a language')],
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};
