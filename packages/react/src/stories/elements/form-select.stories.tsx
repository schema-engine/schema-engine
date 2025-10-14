import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '../shared/story-wrapper';
import { createForm, ValidationPresets } from '../shared/form-builder';

const meta = {
	title: 'Elements/Inputs/FormSelect',
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Dropdown select element for choosing a single option from a list with placeholder and validation support.',
			},
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper>
				<Story />
			</StoryWrapper>
		),
	],
	tags: ['autodocs'],
	argTypes: {
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
		config: createForm()
			.setId('select-default')
			.setTitle('Select Field')
			.addStep({ id: 'step-1', title: 'Choose Option' })
			.addElement('select', {
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
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('select-validation')
			.setTitle('Select with Validation')
			.addStep({ id: 'step-1', title: 'Required Selection' })
			.addElement('select', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Continue', name: 'submit' })
			.build(),
	},
};

export const MultipleSelects: Story = {
	args: {
		config: createForm()
			.setId('select-multiple')
			.setTitle('Profile Setup')
			.setDescription('Tell us about yourself')
			.addStep({ id: 'step-1', title: 'Personal Information' })
			.addElement('select', {
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
			})
			.addElement('select', {
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
			})
			.addElement('select', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Save Profile', name: 'submit' })
			.build(),
	},
};

export const LongOptionsList: Story = {
	args: {
		config: createForm()
			.setId('select-long-list')
			.setTitle('Select with Many Options')
			.addStep({ id: 'step-1', title: 'Choose State' })
			.addElement('select', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

export const Disabled: Story = {
	args: {
		config: createForm()
			.setId('select-disabled')
			.setTitle('Disabled Select States')
			.setDescription('Examples of disabled select fields')
			.addStep({ id: 'step-1', title: 'Settings' })
			.addElement('select', {
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
			})
			.addElement('select', {
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
			})
			.build(),
	},
};

export const MixedStates: Story = {
	args: {
		config: createForm()
			.setId('select-mixed')
			.setTitle('Mixed Select States')
			.setDescription('Combination of enabled and disabled select fields')
			.addStep({ id: 'step-1', title: 'Account Settings' })
			.addElement('select', {
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
			})
			.addElement('select', {
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
			})
			.addElement('select', {
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
			})
			.addElement('submit', { id: 'submit', label: 'Save Settings', name: 'submit' })
			.build(),
	},
};
