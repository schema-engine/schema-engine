import { FormController } from '@/adapters/radiant/controller';
import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent, within, waitFor, fn } from 'storybook/test';
import { clickSubmit, expectFieldError, expectNoFieldError, playFieldFocusAndType } from '@/stories/shared/play';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

async function assertStaticArrayRows(canvasElement: HTMLElement, expected: number): Promise<boolean> {
	if (!isStaticSsrPreview(canvasElement)) return false;
	await expect(canvasElement.querySelectorAll('.se-form-array__item[data-se-row-id]')).toHaveLength(expected);
	return true;
}

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
		if (await assertStaticArrayRows(canvasElement, 1)) return;
		await step('Array starts with one contact row', async () => {
			await expect(
				within(canvasElement).getByText(/emergency contacts/i, { selector: '.se-form-array-field__label' }),
			).toBeInTheDocument();
			await waitFor(async () => expect(within(canvasElement).getByLabelText(/full name/i)).toBeInTheDocument());
			await expect(within(canvasElement).getByLabelText(/phone number/i)).toBeInTheDocument();
		});

		await step('Can add another contact row', async () => {
			const addButton = within(canvasElement).getByRole('button', { name: /add contact/i });
			await userEvent.click(addButton);
			await waitFor(async () => expect(within(canvasElement).getAllByLabelText(/full name/i)).toHaveLength(2));
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
	play: async ({ canvasElement }) => {
		await assertStaticArrayRows(canvasElement, 1);
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
		if (await assertStaticArrayRows(canvasElement, 1)) return;
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

export const ControllerOperations: Story = {
	args: {
		defaultValues: {
			emergencyContacts: [
				{ contactName: 'Alice', contactPhone: '111', relationship: 'Friend' },
				{ contactName: 'Bob', contactPhone: '222', relationship: 'Sibling' },
			],
		},
		onSubmit: fn(),
	},
	play: async ({ canvasElement, args, step }) => {
		if (await assertStaticArrayRows(canvasElement, 2)) return;
		const canvas = within(canvasElement);
		const arrayHost = canvasElement.querySelector<HTMLElement>('se-form-array');
		if (!arrayHost) throw new Error('Expected array component');
		const form = new FormController(arrayHost);
		const array = form.fieldArray('emergencyContacts');
		const names = () => canvas.getAllByLabelText<HTMLInputElement>(/full name/i);
		const listener = fn();
		const stop = form.watchField('emergencyContacts', listener);

		await step('Default values populate registered controls', async () => {
			const firstNameField = canvasElement.querySelector<HTMLElement>(
				'se-field[name="emergencyContacts.0.contactName"]',
			);
			if (!firstNameField) throw new Error('Expected first name field');
			await waitFor(async () => expect(names().map((input) => input.value)).toEqual(['Alice', 'Bob']));
		});
		await step('A plain controller writes live values', async () => {
			form.field('emergencyContacts.0.contactName').onChange('Updated Alice');
			await waitFor(async () => expect(names()[0]).toHaveValue('Updated Alice'));
			await userEvent.clear(names()[1]);
			await userEvent.type(names()[1], 'Typed Bob');
			await expect(form.getValue('emergencyContacts.1.contactName')).toBe('Typed Bob');
		});
		await step('Move and remove keep row identity, DOM values, and submission aligned', async () => {
			const originalIds = array.fields;
			array.move(0, 1);
			await expect(form.getValue('emergencyContacts.0.contactName')).toBe('Typed Bob');
			await expect(form.getValue('emergencyContacts.1.contactName')).toBe('Updated Alice');
			await waitFor(async () =>
				expect(names().map((input) => input.value)).toEqual(['Typed Bob', 'Updated Alice']),
			);
			await expect(array.fields).toEqual([originalIds[1], originalIds[0]]);
			await userEvent.click(canvas.getAllByRole('button', { name: /remove contact/i })[0]);
			await waitFor(async () => expect(names().map((input) => input.value)).toEqual(['Updated Alice']));
			await userEvent.click(canvas.getByRole('button', { name: /save contacts/i }));
			await waitFor(() =>
				expect(args.onSubmit).toHaveBeenCalledWith({
					emergencyContacts: [{ contactName: 'Updated Alice', contactPhone: '111', relationship: 'Friend' }],
				}),
			);
		});
		await step('Watch cleanup stops notifications', async () => {
			stop();
			const count = listener.mock.calls.length;
			form.setValue('emergencyContacts.0.contactName', 'After cleanup');
			await expect(listener).toHaveBeenCalledTimes(count);
		});
		form.disconnect();
	},
};

class PlainFormConsumer extends HTMLElement {
	readonly form = new FormController(this);
	updates = 0;
	connectedCallback(): void {
		this.form.connect(() => {
			this.updates += 1;
		});
	}
	disconnectedCallback(): void {
		this.form.disconnect();
	}
}
if (!customElements.get('se-test-form-consumer')) customElements.define('se-test-form-consumer', PlainFormConsumer);

export const ControllerLifecycle: Story = {
	play: async ({ canvasElement }) => {
		if (await assertStaticArrayRows(canvasElement, 1)) return;
		const host = canvasElement.querySelector<HTMLElement>('se-form-array');
		if (!host) throw new Error('Expected array component');
		const first = new FormController(host);
		const consumer = document.createElement('se-test-form-consumer') as PlainFormConsumer;
		host.append(consumer);
		await waitFor(async () => expect(consumer.updates).toBeGreaterThan(0));
		first.setValue('title', 'First form');
		await expect(consumer.form.getValue('title')).toBe('First form');

		const secondHost = document.createElement('rui-form');
		Reflect.set(secondHost, 'defaultValues', { title: 'Second form' });
		canvasElement.append(secondHost);
		secondHost.append(consumer);
		await expect(consumer.form.getValue('title')).toBe('Second form');
		const updates = consumer.updates;
		first.setValue('title', 'Unrelated change');
		await expect(consumer.updates).toBe(updates);
		consumer.form.setValue('title', 'Changed second');
		await expect(consumer.updates).toBeGreaterThan(updates);
		const second = new FormController(secondHost);
		consumer.remove();
		const disconnectedUpdates = consumer.updates;
		second.setValue('title', 'After disconnect');
		await expect(consumer.updates).toBe(disconnectedUpdates);
		secondHost.remove();
		first.disconnect();
	},
};

export const InitialValuesSeedAddedRows: Story = {
	args: {
		config: fieldFormConfig('array-initial-values', 'Members', [
			{
				$type: 'arrayElements',
				id: 'members',
				name: 'members',
				label: 'Members',
				initialValues: { role: 'viewer' },
				addButtonText: 'Add member',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'role',
						name: 'role',
						label: 'Role',
					},
				],
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (await assertStaticArrayRows(canvasElement, 0)) return;
		await step('initialValues seed a newly added array row', async () => {
			await userEvent.click(within(canvasElement).getByRole('button', { name: /add member/i }));
			await expect(within(canvasElement).getByLabelText(/role/i)).toHaveValue('viewer');
		});
	},
};

export const MinimumItemsValidation: Story = {
	args: {
		config: fieldFormConfig('array-min-items', 'Contacts', [
			{
				$type: 'arrayElements',
				id: 'contacts',
				name: 'contacts',
				label: 'Contacts',
				rules: [{ type: 'minItems', value: 2, message: 'Add at least two contacts' }],
				addButtonText: 'Add contact',
				elements: [
					{
						$type: 'input',
						inputType: 'text',
						id: 'contact',
						name: 'contact',
						label: 'Contact',
					},
				],
			},
			{
				$type: 'submit',
				id: 'submit',
				name: 'submit',
				label: 'Submit contacts',
			},
		]),
		defaultValues: { contacts: ['Alice'] },
		onSubmit: fn(),
	},
	play: async ({ canvasElement, args, step }) => {
		if (await assertStaticArrayRows(canvasElement, 1)) return;
		await step('minItems on the array container blocks an undersized submit', async () => {
			await clickSubmit(canvasElement, /submit contacts/i);
			await expectFieldError(canvasElement, /add at least two contacts/i);
			await expect(args.onSubmit).not.toHaveBeenCalled();
		});
	},
};
