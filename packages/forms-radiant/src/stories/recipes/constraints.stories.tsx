import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';
import { playSelectOption } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Capabilities/Constraints',
	args: {
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
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsDependentField: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const ticket = canvas.getByLabelText(/support ticket number/i);
		await expect(ticket.closest('.se-form-constraint')).toHaveAttribute('hidden');
		await playSelectOption(canvasElement, /subject/i, /technical support/i);
		await expect(ticket.closest('.se-form-constraint')).not.toHaveAttribute('hidden');
	},
};
