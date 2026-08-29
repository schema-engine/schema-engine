import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, within } from 'storybook/test';
import { getFieldControl, playFieldFocusAndType } from '@/stories/shared/play';

const meta = {
	...formRendererMeta,
	title: 'Elements/Inputs/Masked Input',
	args: {
		config: fieldFormConfig('masked-input-card', 'Card Number', [
			{
				$type: 'masked-input',
				id: 'cardNumber',
				name: 'cardNumber',
				label: 'Card Number',
				mask: '9999 9999 9999 9999',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('Field is visible and accepts input', async () => {
			const input = getFieldControl(canvasElement, /card number/i);
			await expect(input).toBeInTheDocument();
			await playFieldFocusAndType(canvasElement, /card number/i, '4242424242424242');
		});
	},
};

export const BankAccount: Story = {
	args: {
		config: fieldFormConfig('masked-input-bank', 'Bank Account', [
			{
				$type: 'masked-input',
				id: 'account',
				name: 'account',
				label: 'Account Number',
				mask: '9999999999',
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		await step('Bank account field is visible', async () => {
			await expect(within(canvasElement).getByLabelText(/account number/i)).toBeInTheDocument();
		});
	},
};
