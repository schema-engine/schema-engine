import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FormRenderer } from '@/components/internals/form-renderer';
import { getEngine } from '@/stories/shared/form-builder.ui';
import { StoryWrapper } from '@/stories/shared/story-wrapper';

const engine = getEngine();

const meta = {
	title: 'Capabilities/Constraints',
	component: FormRenderer,
	args: {
		engine,
		config: {
			id: 'conditional-support-ticket',
			title: 'Contact details',
			steps: [
				{
					id: 'details',
					title: 'Details',
					elements: [
						{
							$type: 'select',
							id: 'subject',
							name: 'subject',
							label: 'Subject',
							options: [
								{ value: 'general', label: 'General question' },
								{ value: 'support', label: 'Technical support' },
							],
						},
						{
							$type: 'input',
							id: 'ticket',
							name: 'ticket',
							label: 'Support ticket number',
							constraints: [{ field: 'subject', operator: 'equals', value: 'support', $type: 'show' }],
						},
					],
				},
			],
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={engine}>
				<Story />
			</StoryWrapper>
		),
	],
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsDependentField: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByLabelText(/support ticket number/i)).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole('combobox', { name: /subject/i }));
		const option = await within(document.body).findByRole('option', { name: /technical support/i });
		await userEvent.click(option);
		await expect(await canvas.findByLabelText(/support ticket number/i)).toBeInTheDocument();
	},
};
