import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';

const meta = {
	...formRendererMeta,
	title: 'Forms/Elements/Inputs/Fieldset',
	args: {
		config: fieldFormConfig('fieldset-default', 'Address', [
			{
				$type: 'fieldSet',
				id: 'address',
				name: 'address',
				label: 'Address',
				elements: [
					{
						$type: 'input',
						id: 'street',
						name: 'street',
						label: 'Street',
						inputType: 'text',
					},
					{
						$type: 'input',
						id: 'city',
						name: 'city',
						label: 'City',
						inputType: 'text',
					},
				],
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Nested fieldset fields render', async () => {
			await expect(within(canvasElement).getByLabelText(/street/i)).toBeInTheDocument();
			await expect(within(canvasElement).getByLabelText(/city/i)).toBeInTheDocument();
		});
	},
};
