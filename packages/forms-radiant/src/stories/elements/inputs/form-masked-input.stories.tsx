import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { queryDeep } from '@/lib/dom-utils';

import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

const ibanMask = 'aa00 0000 0000 000000';
const ibanPlaceholder = 'ES12 4311 2144 214423';

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('masked-input-iban', 'Bank Account', [
			{
				$type: 'masked-input',
				id: 'iban',
				name: 'iban',
				label: 'Bank account (IBAN)',
				mask: ibanMask,
				placeholder: ibanPlaceholder,
				inputMode: 'text',
				autoComplete: 'off',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Field is visible and formats the IBAN', async () => {
			await waitFor(async () => {
				await expect(queryDeep(canvasElement, 'se-masked-input[data-ready]')).toBeTruthy();
			});
			const input = queryDeep(canvasElement, '[data-ref="input"]') as HTMLInputElement | null;
			await expect(input).toBeTruthy();
			if (!input) return;
			await expect(input).toHaveAttribute('placeholder', ibanPlaceholder);
			await userEvent.click(input);
			await userEvent.clear(input);
			await userEvent.type(input, 'ES1243112144214423');
			await expect(input).toHaveValue(ibanPlaceholder);
		});
	},
};

export const CardNumber: Story = {
	args: {
		config: fieldFormConfig('masked-input-card', 'Card Number', [
			{
				$type: 'masked-input',
				id: 'cardNumber',
				name: 'cardNumber',
				label: 'Card Number',
				mask: '0000 0000 0000 0000',
				placeholder: '4242 4242 4242 4242',
				inputMode: 'numeric',
				autoComplete: 'cc-number',
			},
		]),
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await step('Card field is visible', async () => {
			await expect(within(canvasElement).getByPlaceholderText('4242 4242 4242 4242')).toBeInTheDocument();
		});
	},
};
