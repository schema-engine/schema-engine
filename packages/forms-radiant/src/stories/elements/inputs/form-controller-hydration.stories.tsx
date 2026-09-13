import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiFormElement } from '@ecopages/radiant-ui/form';
import { FormController } from '@/adapters/radiant/controller';
import { FormFieldElement } from '@/elements/form-field';

void RuiFormElement;

const meta = {
	title: 'Forms/Form controller hydration',
	render: () => <div />,
	tags: ['!dev'],
	parameters: { radiant: { renderMode: 'client' } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Recreates the server-authored field context without supplying client rules props. */
export const HydratedField: Story = {
	play: async ({ canvasElement }) => {
		canvasElement.innerHTML = `
			<rui-form data-default-values='{"name":"Ada"}'>
				<form data-ref="form" novalidate>
					<se-field name="name">
						<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="fieldProvider">
							{"name":"name","controlId":"","descriptionId":"","errorId":"","invalid":false,"required":false,"rules":{"required":"Name is required"}}
						</script>
						<label data-rui-field-label>Name</label>
						<input data-rui-control type="text" />
						<span data-rui-field-error role="alert"></span>
					</se-field>
				</form>
			</rui-form>`;
		const canvas = within(canvasElement);
		await waitFor(() => expect(canvas.getByLabelText('Name')).toHaveValue('Ada'));
		const field = canvasElement.querySelector('se-field');
		if (!(field instanceof FormFieldElement)) throw new Error('Expected hydrated field');
		await expect(field.form.ready).toBe(true);
		const form = new FormController(field);
		await userEvent.clear(canvas.getByLabelText('Name'));
		await expect(await form.trigger()).toBe(false);
		await expect(form.field('name').error).toBe('Name is required');
		form.setValue('name', 'Grace');
		await waitFor(() => expect(canvas.getByLabelText('Name')).toHaveValue('Grace'));
		await expect(await form.trigger()).toBe(true);
		await expect(form.getValues()).toEqual({ name: 'Grace' });
	},
};
