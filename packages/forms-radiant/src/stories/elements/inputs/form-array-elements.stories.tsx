import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent, within } from 'storybook/test';
import { clickSubmit, expectFieldError, expectNoFieldError, playFieldFocusAndType } from '@/stories/shared/play';

const emergencyContactsConfig = fieldFormConfig(
	'emergency-contacts',
	'Emergency contacts',
	[
		{
			$type: 'arrayElements',
			id: 'emergencyContacts',
			name: 'emergencyContacts',
			label: 'Emergency contacts',
			description: 'Add at least one person we can reach if we cannot get hold of you.',
			minItems: 1,
			maxItems: 3,
			addButtonText: 'Add contact',
			removeButtonText: 'Remove contact',
			emptyStateMessage: 'No emergency contacts added yet.',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'contactName',
					name: 'contactName',
					label: 'Full name',
					placeholder: 'Jane Doe',
				},
				{
					$type: 'input',
					inputType: 'tel',
					id: 'contactPhone',
					name: 'contactPhone',
					label: 'Phone number',
					placeholder: '+1 (555) 000-0000',
				},
				{
					$type: 'input',
					inputType: 'text',
					id: 'relationship',
					name: 'relationship',
					label: 'Relationship',
					placeholder: 'Spouse, parent, friend…',
				},
			],
		},
		{
			$type: 'submit',
			id: 'submit',
			name: 'submit',
			label: 'Save contacts',
		},
	],
	'People we should call in an emergency.',
);

const meta = {
	...formRendererMeta,
	args: {
		config: emergencyContactsConfig,
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Array starts with one contact row', async () => {
			await expect(within(canvasElement).getByText(/emergency contacts/i)).toBeInTheDocument();
			await expect(within(canvasElement).getByLabelText(/full name/i)).toBeInTheDocument();
			await expect(within(canvasElement).getByLabelText(/phone number/i)).toBeInTheDocument();
		});

		await step('Can add another contact row', async () => {
			const addButton = within(canvasElement).getByRole('button', { name: /add contact/i });
			await userEvent.click(addButton);
			await expect(within(canvasElement).getAllByLabelText(/full name/i)).toHaveLength(2);
		});
	},
};

export const SingleField: Story = {
	args: {
		config: fieldFormConfig('skills-list', 'Professional skills', [
			{
				$type: 'arrayElements',
				id: 'skills',
				name: 'skills',
				label: 'Skills',
				description: 'List technologies or tools you use regularly.',
				minItems: 1,
				maxItems: 6,
				addButtonText: 'Add skill',
				removeButtonText: 'Remove skill',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'skill',
						name: 'skill',
						label: 'Skill',
						placeholder: 'TypeScript, Figma, project management…',
					},
				],
			},
		]),
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig(
			'array-validation',
			'References',
			[
				{
					$type: 'arrayElements',
					id: 'references',
					name: 'references',
					label: 'References',
					description: 'Add at least one professional reference.',
					minItems: 1,
					maxItems: 3,
					addButtonText: 'Add reference',
					removeButtonText: 'Remove reference',
					elements: [
						{
							$type: 'input',
							inputType: 'text',
							id: 'refName',
							name: 'refName',
							label: 'Reference name',
							placeholder: 'Alex Rivera',
							rules: [{ type: 'required', message: 'Name is required' }],
						},
						{
							$type: 'input',
							inputType: 'email',
							id: 'refEmail',
							name: 'refEmail',
							label: 'Email',
							placeholder: 'alex@company.com',
							rules: [{ type: 'required', message: 'Email is required' }],
						},
					],
				},
				{
					$type: 'submit',
					id: 'submit',
					name: 'submit',
					label: 'Submit references',
				},
			],
			'Provide a name and email for each reference.',
		),
	},
	play: async ({ canvasElement, step }) => {
		await step('Empty submit shows nested field errors', async () => {
			await clickSubmit(canvasElement, /submit references/i);
			await expectFieldError(canvasElement, /name is required/i);
			await expectFieldError(canvasElement, /email is required/i);
		});

		await step('Valid values clear nested field errors', async () => {
			await playFieldFocusAndType(canvasElement, /reference name/i, 'Alex Rivera');
			await playFieldFocusAndType(canvasElement, /email/i, 'alex@company.com');
			await clickSubmit(canvasElement, /submit references/i);
			await expectNoFieldError(canvasElement, /name is required/i);
			await expectNoFieldError(canvasElement, /email is required/i);
		});
	},
};
