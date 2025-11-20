import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRenderer } from '@/components/internals/form-renderer';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { createForm, ValidationPresets } from '@/stories/shared/form-builder.shadcn';

const meta = {
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Dynamic array field component that manages repeatable form fields. Supports single field arrays, complex multi-field objects, min/max constraints, and nested arrays.',
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
						$type: 'input',
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
						$type: 'input',
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
						$type: 'input',
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
						$type: 'input',
						inputType: 'tel',
						id: 'refPhone',
						name: 'refPhone',
						label: 'Phone Number',
						placeholder: '+1 (555) 000-0000',
						rules: [ValidationPresets.string.required('Phone number is required')],
					},
					{
						$type: 'select',
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
						$type: 'input',
						inputType: 'text',
						id: 'fullName',
						name: 'fullName',
						label: 'Full Name',
						placeholder: 'Enter full name',
						rules: [ValidationPresets.string.required('Name is required')],
					},
					{
						$type: 'input',
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
						$type: 'select',
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
				description: 'Required: 1-3 contacts',
				minItems: 1,
				maxItems: 3,
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'contactName',
						name: 'contactName',
						label: 'Contact Name',
						placeholder: 'Enter name',
						rules: [ValidationPresets.string.required('Contact name is required')],
					},
					{
						$type: 'input',
						inputType: 'tel',
						id: 'phone',
						name: 'phone',
						label: 'Phone Number',
						placeholder: 'Enter phone number',
						rules: [ValidationPresets.string.required('Phone number is required')],
					},
					{
						$type: 'select',
						id: 'relationship',
						name: 'relationship',
						label: 'Relationship',
						placeholder: 'Select relationship',
						options: [
							{ label: 'Family', value: 'family' },
							{ label: 'Friend', value: 'friend' },
							{ label: 'Colleague', value: 'colleague' },
							{ label: 'Other', value: 'other' },
						],
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit', name: 'submit' })
			.build(),
	},
};

export const CustomButtonText: Story = {
	args: {
		config: createForm()
			.setId('array-custom-buttons')
			.setTitle('Skills')
			.setDescription('List your professional skills')
			.addStep({ id: 'step-1', title: 'Your Skills' })
			.addElement('arrayElements', {
				id: 'skills',
				name: 'skills',
				label: 'Skills',
				addButtonText: 'Add Another Skill',
				removeButtonText: 'Remove Skill',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'skillName',
						name: 'skillName',
						label: 'Skill',
						placeholder: 'e.g., JavaScript, Design, Project Management',
					},
					{
						$type: 'select',
						id: 'level',
						name: 'level',
						label: 'Proficiency Level',
						placeholder: 'Select level',
						options: [
							{ label: 'Beginner', value: 'beginner' },
							{ label: 'Intermediate', value: 'intermediate' },
							{ label: 'Advanced', value: 'advanced' },
							{ label: 'Expert', value: 'expert' },
						],
					},
				],
			})
			.build(),
	},
};

export const ComplexForm: Story = {
	args: {
		config: createForm()
			.setId('array-complex')
			.setTitle('Project Information')
			.setDescription('Add details about your projects')
			.addStep({ id: 'step-1', title: 'Projects' })
			.addElement('arrayElements', {
				id: 'projects',
				name: 'projects',
				label: 'Projects',
				description: 'Add your professional projects',
				minItems: 1,
				maxItems: 5,
				addButtonText: 'Add Project',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'projectName',
						name: 'projectName',
						label: 'Project Name',
						placeholder: 'Enter project name',
						rules: [ValidationPresets.string.required('Project name is required')],
					},
					{
						$type: 'textarea',
						id: 'description',
						name: 'description',
						label: 'Description',
						placeholder: 'Describe the project',
						rows: 3,
					},
					{
						$type: 'input',
						inputType: 'url',
						id: 'projectUrl',
						name: 'projectUrl',
						label: 'Project URL',
						placeholder: 'https://example.com',
						rules: [ValidationPresets.string.url('Please enter a valid URL')],
					},
					{
						$type: 'select',
						id: 'status',
						name: 'status',
						label: 'Status',
						placeholder: 'Select status',
						options: [
							{ label: 'In Progress', value: 'in-progress' },
							{ label: 'Completed', value: 'completed' },
							{ label: 'On Hold', value: 'on-hold' },
						],
					},
					{
						$type: 'checkbox',
						id: 'featured',
						name: 'featured',
						label: 'Featured Project',
						description: 'Highlight this project',
					},
				],
			})
			.addElement('submit', { id: 'submit', label: 'Submit Projects', name: 'submit' })
			.build(),
	},
};

export const NestedArrays: Story = {
	args: {
		config: createForm()
			.setId('array-nested')
			.setTitle('Company Departments')
			.setDescription('Manage departments and their employees')
			.addStep({ id: 'step-1', title: 'Organization' })
			.addElement('arrayElements', {
				id: 'departments',
				name: 'departments',
				label: 'Departments',
				description: 'Add departments with their employees',
				maxItems: 3,
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'deptName',
						name: 'deptName',
						label: 'Department Name',
						placeholder: 'e.g., Engineering, Sales, Marketing',
						rules: [ValidationPresets.string.required('Department name is required')],
					},
					{
						$type: 'arrayElements',
						id: 'employees',
						name: 'employees',
						label: 'Employees',
						description: 'Add employees in this department',
						maxItems: 5,
						addButtonText: 'Add Employee',
						elements: [
							{
								$type: 'input',
								inputType: 'text',
								id: 'employeeName',
								name: 'employeeName',
								label: 'Employee Name',
								placeholder: 'Enter employee name',
							},
							{
								$type: 'input',
								inputType: 'email',
								id: 'employeeEmail',
								name: 'employeeEmail',
								label: 'Email',
								placeholder: 'employee@company.com',
							},
						],
					},
				],
			})
			.build(),
	},
};

export const WithDifferentInputTypes: Story = {
	args: {
		config: createForm()
			.setId('array-input-types')
			.setTitle('Education History')
			.setDescription('Add your educational background')
			.addStep({ id: 'step-1', title: 'Education' })
			.addElement('arrayElements', {
				id: 'education',
				name: 'education',
				label: 'Education',
				addButtonText: 'Add Education',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'institution',
						name: 'institution',
						label: 'Institution',
						placeholder: 'University or School name',
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'degree',
						name: 'degree',
						label: 'Degree',
						placeholder: 'Bachelor of Science',
					},
					{
						$type: 'number',
						id: 'graduationYear',
						name: 'graduationYear',
						label: 'Graduation Year',
						placeholder: '2023',
						min: 1950,
						max: 2030,
					},
					{
						$type: 'number',
						id: 'gpa',
						name: 'gpa',
						label: 'GPA',
						placeholder: '3.5',
						min: 0,
						max: 4,
						step: 0.1,
					},
					{
						$type: 'switch',
						id: 'graduated',
						name: 'graduated',
						label: 'Graduated',
						description: 'Toggle if you have graduated',
					},
				],
			})
			.build(),
	},
};

export const EmptyState: Story = {
	args: {
		config: createForm()
			.setId('array-empty')
			.setTitle('Address Book')
			.setDescription('Start by adding your first address')
			.addStep({ id: 'step-1', title: 'Addresses' })
			.addElement('arrayElements', {
				id: 'addresses',
				name: 'addresses',
				label: 'Addresses',
				description: 'No addresses added yet - click the button below to add one',
				addButtonText: 'Add Address',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'street',
						name: 'street',
						label: 'Street Address',
						placeholder: '123 Main St',
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'city',
						name: 'city',
						label: 'City',
						placeholder: 'New York',
					},
					{
						$type: 'input',
						inputType: 'text',
						id: 'zipCode',
						name: 'zipCode',
						label: 'ZIP Code',
						placeholder: '10001',
					},
				],
			})
			.build(),
	},
};
