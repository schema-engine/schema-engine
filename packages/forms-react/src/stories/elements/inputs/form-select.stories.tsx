import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { defineStoryForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.ui';
import { showsDefaultOptionLabelPlay, showsPickedOptionLabelPlay } from './form-select.play';

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
					'Dropdown select element for choosing single or multiple options with support for scrollable chip display in multiple mode. Includes placeholder, validation, and checkmark indicators. Base UI implementation.',
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
			description: 'Form configuration with select element',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-default',
			title: 'Select Field',
			steps: [
				{
					id: 'step-1',
					title: 'Choose Option',
					elements: [
						{
							$type: 'select',
							id: 'country',
							name: 'country',
							label: 'Country',
							placeholder: 'Select your country',
							options: [
								{ value: 'us', label: 'United States' },
								{ value: 'uk', label: 'United Kingdom' },
								{ value: 'ca', label: 'Canada' },
								{ value: 'au', label: 'Australia' },
							],
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
			id: 'select-validation',
			title: 'Select with Validation',
			steps: [
				{
					id: 'step-1',
					title: 'Required Selection',
					elements: [
						{
							$type: 'select',
							id: 'role',
							name: 'role',
							label: 'What best describes you?',
							placeholder: 'Select your role',
							description: 'This helps us personalize your experience',
							options: [
								{ value: 'developer', label: 'Developer' },
								{ value: 'designer', label: 'Designer' },
								{ value: 'manager', label: 'Product Manager' },
								{ value: 'other', label: 'Other' },
							],
							rules: [ValidationPresets.string.required('Please select a role')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleSelects: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-multiple',
			title: 'Profile Setup',
			description: 'Tell us about yourself',
			steps: [
				{
					id: 'step-1',
					title: 'Personal Information',
					elements: [
						{
							$type: 'select',
							id: 'country',
							name: 'country',
							label: 'Country',
							placeholder: 'Select your country',
							options: [
								{ value: 'us', label: 'United States' },
								{ value: 'uk', label: 'United Kingdom' },
								{ value: 'ca', label: 'Canada' },
								{ value: 'au', label: 'Australia' },
								{ value: 'de', label: 'Germany' },
								{ value: 'fr', label: 'France' },
							],
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'select',
							id: 'experienceLevel',
							name: 'experienceLevel',
							label: 'Years of experience',
							placeholder: 'Select experience level',
							options: [
								{ value: '0-1', label: 'Less than 1 year' },
								{ value: '1-3', label: '1-3 years' },
								{ value: '3-5', label: '3-5 years' },
								{ value: '5+', label: 'More than 5 years' },
							],
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'select',
							id: 'industry',
							name: 'industry',
							label: 'Industry',
							placeholder: 'Select your industry',
							options: [
								{ value: 'tech', label: 'Technology' },
								{ value: 'finance', label: 'Finance' },
								{ value: 'healthcare', label: 'Healthcare' },
								{ value: 'education', label: 'Education' },
								{ value: 'other', label: 'Other' },
							],
						},
						{ $type: 'submit', id: 'submit', label: 'Save Profile', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const LongOptionsList: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-long-list',
			title: 'Select with Many Options',
			steps: [
				{
					id: 'step-1',
					title: 'Choose State',
					elements: [
						{
							$type: 'select',
							id: 'state',
							name: 'state',
							label: 'State',
							placeholder: 'Select your state',
							options: [
								{ value: 'al', label: 'Alabama' },
								{ value: 'ak', label: 'Alaska' },
								{ value: 'az', label: 'Arizona' },
								{ value: 'ar', label: 'Arkansas' },
								{ value: 'ca', label: 'California' },
								{ value: 'co', label: 'Colorado' },
								{ value: 'ct', label: 'Connecticut' },
								{ value: 'de', label: 'Delaware' },
								{ value: 'fl', label: 'Florida' },
								{ value: 'ga', label: 'Georgia' },
								{ value: 'hi', label: 'Hawaii' },
								{ value: 'id', label: 'Idaho' },
								{ value: 'il', label: 'Illinois' },
								{ value: 'in', label: 'Indiana' },
								{ value: 'ia', label: 'Iowa' },
							],
							rules: [ValidationPresets.string.required('Please select your state')],
						},
						{ $type: 'submit', id: 'submit', label: 'Submit', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const Disabled: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-disabled',
			title: 'Disabled Select States',
			description: 'Examples of disabled select fields',
			steps: [
				{
					id: 'step-1',
					title: 'Settings',
					elements: [
						{
							$type: 'select',
							id: 'disabledEmpty',
							name: 'disabledEmpty',
							label: 'Disabled (no selection)',
							placeholder: 'Cannot select',
							options: [
								{ value: 'option1', label: 'Option 1' },
								{ value: 'option2', label: 'Option 2' },
								{ value: 'option3', label: 'Option 3' },
							],
							disabled: true,
						},
						{
							$type: 'select',
							id: 'disabledWithValue',
							name: 'disabledWithValue',
							label: 'Disabled (with selection)',
							description: 'This value is locked',
							options: [
								{ value: 'us', label: 'United States' },
								{ value: 'uk', label: 'United Kingdom' },
								{ value: 'ca', label: 'Canada' },
							],
							disabled: true,
							defaultValue: 'us',
						},
					],
				},
			],
		}),
	},
};

export const MixedStates: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-mixed',
			title: 'Mixed Select States',
			description: 'Combination of enabled and disabled select fields',
			steps: [
				{
					id: 'step-1',
					title: 'Account Settings',
					elements: [
						{
							$type: 'select',
							id: 'accountType',
							name: 'accountType',
							label: 'Account Type',
							description: 'Cannot be changed after creation',
							options: [
								{ value: 'personal', label: 'Personal' },
								{ value: 'business', label: 'Business' },
								{ value: 'enterprise', label: 'Enterprise' },
							],
							disabled: true,
							defaultValue: 'business',
						},
						{
							$type: 'select',
							id: 'language',
							name: 'language',
							label: 'Preferred Language',
							placeholder: 'Select language',
							options: [
								{ value: 'en', label: 'English' },
								{ value: 'es', label: 'Spanish' },
								{ value: 'fr', label: 'French' },
								{ value: 'de', label: 'German' },
							],
							rules: [ValidationPresets.string.required()],
						},
						{
							$type: 'select',
							id: 'timezone',
							name: 'timezone',
							label: 'Timezone',
							placeholder: 'Select timezone',
							options: [
								{ value: 'est', label: 'Eastern Time' },
								{ value: 'cst', label: 'Central Time' },
								{ value: 'mst', label: 'Mountain Time' },
								{ value: 'pst', label: 'Pacific Time' },
							],
						},
						{ $type: 'submit', id: 'submit', label: 'Save Settings', name: 'submit' },
					],
				},
			],
		}),
	},
};

export const MultipleSelection: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-multiple-selection',
			title: 'Programming Languages',
			description: 'Select all languages you are proficient in',
			steps: [
				{
					id: 'step-1',
					title: 'Skills',
					elements: [
						{
							$type: 'select',
							id: 'languages',
							name: 'languages',
							label: 'Programming Languages',
							placeholder: 'Select languages',
							multiple: true,
							defaultValue: [],
							options: [
								{ value: 'javascript', label: 'JavaScript' },
								{ value: 'typescript', label: 'TypeScript' },
								{ value: 'python', label: 'Python' },
								{ value: 'java', label: 'Java' },
								{ value: 'csharp', label: 'C#' },
								{ value: 'php', label: 'PHP' },
								{ value: 'cpp', label: 'C++' },
								{ value: 'rust', label: 'Rust' },
								{ value: 'go', label: 'Go' },
								{ value: 'swift', label: 'Swift' },
							],
							rules: [ValidationPresets.array.minItems(1, 'Please select at least one language')],
						},
						{ $type: 'submit', id: 'submit', label: 'Continue', name: 'submit' },
					],
				},
			],
		}),
	},
};

const frequencyOptions = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
];

export const ShowsDefaultOptionLabel: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-default-label',
			title: 'Digest',
			steps: [
				{
					id: 'step-1',
					title: 'Digest',
					elements: [
						{
							$type: 'select',
							id: 'frequency',
							name: 'frequency',
							label: 'Frequency',
							options: frequencyOptions,
							defaultValue: 'weekly',
						},
					],
				},
			],
		}),
	},
	play: showsDefaultOptionLabelPlay,
};

export const ShowsPickedOptionLabel: Story = {
	args: {
		config: defineStoryForm({
			id: 'select-picked-label',
			title: 'Digest',
			steps: [
				{
					id: 'step-1',
					title: 'Digest',
					elements: [
						{
							$type: 'select',
							id: 'frequency',
							name: 'frequency',
							label: 'Frequency',
							placeholder: 'Pick a frequency',
							options: frequencyOptions,
						},
					],
				},
			],
		}),
	},
	play: showsPickedOptionLabelPlay,
};
