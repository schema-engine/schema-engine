import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, getEngine, ValidationPresets } from '@/stories/shared/form-builder.base-ui';

const baseUIEngine = getEngine();

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Dynamic array field component that manages repeatable form fields. Supports single field arrays, complex multi-field objects, min/max constraints, and nested arrays. Base UI implementation.',
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
	tags: ['autodocs'],
	argTypes: {
		config: {
			control: 'object',
			description: 'Form configuration with array elements',
		},
	},
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		config: createForm()
			.setId('array-default')
			.setTitle('Contact List')
			.setDescription('Add multiple contacts')
			.addStep({ id: 'step-1', title: 'Contacts' })
			.addElement('arrayElements', {
				id: 'contacts',
				name: 'contacts',
				label: 'Contacts',
				description: 'Add one or more contacts',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'name',
						name: 'name',
						label: 'Name',
						placeholder: 'Enter contact name',
					},
				],
			})
			.build(),
	},
};

export const WithValidation: Story = {
	args: {
		config: createForm()
			.setId('array-validation')
			.setTitle('References')
			.setDescription('Provide at least 2 professional references')
			.addStep({ id: 'step-1', title: 'Professional References' })
			.addElement('arrayElements', {
				id: 'references',
				name: 'references',
				label: 'References',
				description: 'Add at least 2 professional references',
				minItems: 2,
				maxItems: 5,
				rules: [
					ValidationPresets.array.minItems(2, 'Please provide at least 2 references'),
					ValidationPresets.array.maxItems(5, 'You can add up to 5 references'),
				],
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'refName',
						name: 'refName',
						label: 'Reference Name',
						placeholder: 'Enter full name',
						rules: [
							ValidationPresets.string.required('Name is required'),
							ValidationPresets.string.minLength(2, 'Name must be at least 2 characters'),
						],
					},
					{
						__id: 'input',
						inputType: 'email',
						id: 'refEmail',
						name: 'refEmail',
						label: 'Email',
						placeholder: 'reference@company.com',
						rules: [
							ValidationPresets.string.required('Email is required'),
							ValidationPresets.string.email('Please enter a valid email address'),
						],
					},
					{
						__id: 'input',
						inputType: 'tel',
						id: 'refPhone',
						name: 'refPhone',
						label: 'Phone Number',
						placeholder: '+1 (555) 000-0000',
						rules: [ValidationPresets.string.required('Phone number is required')],
					},
					{
						__id: 'select',
						id: 'relationship',
						name: 'relationship',
						label: 'Relationship',
						placeholder: 'Select relationship',
						rules: [ValidationPresets.string.required('Please select a relationship')],
						options: [
							{ label: 'Former Manager', value: 'manager' },
							{ label: 'Colleague', value: 'colleague' },
							{ label: 'Client', value: 'client' },
							{ label: 'Professor', value: 'professor' },
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit References', name: 'submit' })
			.build(),
	},
};

export const MultipleFields: Story = {
	args: {
		config: createForm()
			.setId('array-multiple-fields')
			.setTitle('Team Members')
			.setDescription('Add your team members')
			.addStep({ id: 'step-1', title: 'Team' })
			.addElement('arrayElements', {
				id: 'team',
				name: 'team',
				label: 'Team Members',
				description: 'Add team members with their details',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'fullName',
						name: 'fullName',
						label: 'Full Name',
						placeholder: 'Enter full name',
						rules: [ValidationPresets.string.required('Name is required')],
					},
					{
						__id: 'input',
						inputType: 'email',
						id: 'email',
						name: 'email',
						label: 'Email',
						placeholder: 'Enter email address',
						rules: [
							ValidationPresets.string.email('Please enter a valid email address'),
							ValidationPresets.string.required('Email is required'),
						],
					},
					{
						__id: 'select',
						id: 'role',
						name: 'role',
						label: 'Role',
						placeholder: 'Select role',
						options: [
							{ label: 'Developer', value: 'developer' },
							{ label: 'Designer', value: 'designer' },
							{ label: 'Manager', value: 'manager' },
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Team', name: 'submit' })
			.build(),
	},
};

export const WithMinMaxConstraints: Story = {
	args: {
		config: createForm()
			.setId('array-min-max')
			.setTitle('Emergency Contacts')
			.setDescription('Provide at least 1 and up to 3 emergency contacts')
			.addStep({ id: 'step-1', title: 'Emergency Info' })
			.addElement('arrayElements', {
				id: 'emergencyContacts',
				name: 'emergencyContacts',
				label: 'Emergency Contacts',
				description: 'Add emergency contact information',
				minItems: 1,
				maxItems: 3,
				addButtonText: 'Add Emergency Contact',
				removeButtonText: 'Delete Contact',
				rules: [
					ValidationPresets.array.minItems(1, 'At least one emergency contact is required'),
					ValidationPresets.array.maxItems(3, 'You can add up to 3 emergency contacts'),
				],
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'contactName',
						name: 'contactName',
						label: 'Contact Name',
						placeholder: 'Full name',
						rules: [ValidationPresets.string.required('Name is required')],
					},
					{
						__id: 'input',
						inputType: 'tel',
						id: 'contactPhone',
						name: 'contactPhone',
						label: 'Phone',
						placeholder: '+1 (555) 000-0000',
						rules: [ValidationPresets.string.required('Phone is required')],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'relationship',
						name: 'relationship',
						label: 'Relationship',
						placeholder: 'e.g., Spouse, Parent, Friend',
						rules: [ValidationPresets.string.required('Relationship is required')],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Contacts', name: 'submit' })
			.build(),
	},
};

export const SingleFieldArray: Story = {
	args: {
		config: createForm()
			.setId('array-single-field')
			.setTitle('Skills')
			.setDescription('List your professional skills')
			.addStep({ id: 'step-1', title: 'Skills' })
			.addElement('arrayElements', {
				id: 'skills',
				name: 'skills',
				label: 'Professional Skills',
				description: 'Add each skill on a separate line',
				addButtonText: 'Add Skill',
				removeButtonText: 'Remove',
				emptyStateMessage: 'No skills added yet. Click "Add Skill" to get started.',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'skill',
						name: 'skill',
						label: 'Skill',
						placeholder: 'e.g., JavaScript, React, TypeScript',
						rules: [ValidationPresets.string.required('Skill cannot be empty')],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Skills', name: 'submit' })
			.build(),
	},
};

export const NestedArrays: Story = {
	args: {
		config: createForm()
			.setId('array-nested')
			.setTitle('Company Projects')
			.setDescription('Manage company projects and tasks')
			.addStep({ id: 'step-1', title: 'Projects' })
			.addElement('arrayElements', {
				id: 'projects',
				name: 'projects',
				label: 'Projects',
				description: 'Add projects with their tasks',
				addButtonText: 'Add Project',
				removeButtonText: 'Remove Project',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'projectName',
						name: 'projectName',
						label: 'Project Name',
						placeholder: 'Enter project name',
						rules: [ValidationPresets.string.required('Project name is required')],
					},
					{
						__id: 'textarea',
						id: 'description',
						name: 'description',
						label: 'Description',
						placeholder: 'Project description',
						rows: 3,
					},
					{
						__id: 'arrayElements',
						id: 'tasks',
						name: 'tasks',
						label: 'Tasks',
						description: 'Project tasks',
						addButtonText: 'Add Task',
						elements: [
							{
								__id: 'input',
								inputType: 'text',
								id: 'taskName',
								name: 'taskName',
								label: 'Task',
								placeholder: 'Task name',
								rules: [ValidationPresets.string.required('Task name is required')],
							},
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Projects', name: 'submit' })
			.build(),
	},
};

export const WithCustomMessages: Story = {
	args: {
		config: createForm()
			.setId('array-custom-messages')
			.setTitle('Educational Background')
			.setDescription('Add your educational history')
			.addStep({ id: 'step-1', title: 'Education' })
			.addElement('arrayElements', {
				id: 'education',
				name: 'education',
				label: 'Educational Background',
				description: 'List all degrees and certifications',
				minItems: 1,
				maxItems: 10,
				addButtonText: '+ Add Education',
				removeButtonText: 'Remove',
				emptyStateMessage: 'No education records added yet.',
				elements: [
					{
						__id: 'input',
						inputType: 'text',
						id: 'institution',
						name: 'institution',
						label: 'Institution',
						placeholder: 'School, College, or University',
						rules: [ValidationPresets.string.required('Institution is required')],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'degree',
						name: 'degree',
						label: 'Degree',
						placeholder: 'e.g., Bachelor of Science',
						rules: [ValidationPresets.string.required('Degree is required')],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'field',
						name: 'field',
						label: 'Field of Study',
						placeholder: 'e.g., Computer Science',
						rules: [ValidationPresets.string.required('Field of study is required')],
					},
					{
						__id: 'input',
						inputType: 'text',
						id: 'graduationYear',
						name: 'graduationYear',
						label: 'Graduation Year',
						placeholder: 'YYYY',
						rules: [
							ValidationPresets.string.required('Graduation year is required'),
							ValidationPresets.string.pattern('/^\\d{4}$/', 'Please enter a valid year'),
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Save Education', name: 'submit' })
			.build(),
	},
};
