import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { queryDeep } from '@/stories/shared/dom-utils';
import type { StoryContext } from 'storybook/internal/types';

import type { SePhoneInput } from '@/elements/inputs/form-phone-input';
import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

async function waitForPhoneReady(canvasElement: HTMLElement) {
	await waitFor(async () => {
		await expect(queryDeep(canvasElement, 'se-phone-input[data-ready]')).toBeTruthy();
	});
}

const meta = {
	...formRendererMeta,
	args: {
		config: fieldFormConfig('phone-input-default', 'Phone Number', [
			{
				$type: 'phone-input',
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '(202) 555-0123',
				defaultCountry: 'US',
			},
		]),
	},
} satisfies Meta<typeof formRendererMeta.component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }: StoryContext) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await waitForPhoneReady(canvasElement);

		await step('Country flag is the same SVG artwork as React', async () => {
			const flag = queryDeep(canvasElement, '.se-phone__flag svg');
			await expect(flag).toBeTruthy();
			await expect(flag?.getAttribute('viewBox')).toBeTruthy();
		});

		await step('Field is visible and formats national numbers', async () => {
			const input = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement | null;
			await expect(input).toBeTruthy();
			await userEvent.click(input as HTMLInputElement);
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, '2025550123');
			await waitFor(async () => {
				await expect((queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement).value).toBe(
					'(202) 555-0123',
				);
			});
		});
	},
};

export const WithValidation: Story = {
	args: {
		config: fieldFormConfig('phone-input-validation', 'Phone Number', [
			{
				$type: 'phone-input',
				id: 'phone',
				name: 'phone',
				label: 'Phone Number',
				placeholder: '(202) 555-0123',
				rules: [
					{ $type: 'required', message: 'Phone number is required' },
					{ $type: 'phone', message: 'Enter a complete phone number' },
				],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: async ({ canvasElement, step }: StoryContext) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await waitForPhoneReady(canvasElement);
		const input = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement | null;
		await expect(input).toBeTruthy();
		if (!input) return;

		await step('A country prefix alone is invalid', async () => {
			await userEvent.click(input);
			await userEvent.type(input, '+44');
			await userEvent.click(within(canvasElement).getByRole('button', { name: /submit/i }));
			await waitFor(async () => {
				await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
					'Enter a complete phone number',
				);
			});
		});

		await step('A complete number clears the validation error', async () => {
			await userEvent.type(input, '2079460958');
			await userEvent.click(within(canvasElement).getByRole('button', { name: /submit/i }));
			await waitFor(async () => {
				await expect(within(canvasElement).queryByRole('alert')).toBeNull();
			});
		});
	},
};

export const ArrowCountrySelection: Story = {
	play: async ({ canvasElement, step }: StoryContext) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await waitForPhoneReady(canvasElement);
		const host = queryDeep(canvasElement, 'se-phone-input') as SePhoneInput;

		await step('Arrow keys move the active country and Enter selects it', async () => {
			await expect(host.getAttribute('data-country')).toBe('US');
			await userEvent.click(within(canvasElement).getByRole('combobox', { name: /country/i }));
			await userEvent.keyboard('{ArrowDown}');

			const active = await waitFor(async () => {
				const option = queryDeep(canvasElement, '[role="option"][data-active]') as HTMLElement | null;
				await expect(option).toBeTruthy();
				return option as HTMLElement;
			});

			if (active.getAttribute('data-value') === 'US') {
				await userEvent.keyboard('{ArrowDown}');
			}

			const selected = await waitFor(async () => {
				const option = queryDeep(canvasElement, '[role="option"][data-active]') as HTMLElement | null;
				await expect(option?.getAttribute('data-value')).toBeTruthy();
				await expect(option?.getAttribute('data-value')).not.toBe('US');
				return option?.getAttribute('data-value') as string;
			});

			await userEvent.keyboard('{Enter}');
			await waitFor(async () => {
				await expect(host.getAttribute('data-country')).toBe(selected);
			});
		});
	},
};

export const CallingCodeCountry: Story = {
	play: async ({ canvasElement, step }: StoryContext) => {
		if (isStaticSsrPreview(canvasElement)) return;
		await waitForPhoneReady(canvasElement);
		const host = queryDeep(canvasElement, 'se-phone-input') as SePhoneInput;

		await step('Typing an international prefix selects that country', async () => {
			await expect(host.getAttribute('data-country')).toBe('US');
			const input = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement | null;
			await expect(input).toBeTruthy();
			await userEvent.click(input as HTMLInputElement);
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, '+44', { delay: 20 });
			await waitFor(async () => {
				await expect(host.getAttribute('data-country')).toBe('GB');
			});
			await waitFor(async () => {
				const visible = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement;
				await expect(visible.value).toContain('+44');
				await expect(host.value).toBe('+44');
			});

			await userEvent.type(input as HTMLInputElement, '20');
			await waitFor(async () => {
				const visible = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement;
				await expect(visible.value).not.toContain('+');
				await expect(host.value.startsWith('+44')).toBe(true);
			});
		});
	},
};
