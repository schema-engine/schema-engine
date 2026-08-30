import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { fieldFormConfig, formRendererMeta } from '@/stories/shared/form-story';
import { createValidationFieldPlay } from '@/stories/shared/field-plays';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { queryDeep } from '@/lib/dom-utils';
import type { StoryContext } from 'storybook/internal/types';

async function waitForPhoneReady(canvasElement: HTMLElement) {
	await waitFor(() => {
		expect(queryDeep(canvasElement, 'se-phone-input[data-ready]')).toBeTruthy();
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
		await waitForPhoneReady(canvasElement);

		await step('Country flag is the same SVG artwork as React', async () => {
			const flag = queryDeep(canvasElement, '.se-phone__flag svg');
			expect(flag).toBeTruthy();
			expect(flag?.getAttribute('viewBox')).toBeTruthy();
		});

		await step('Field is visible and formats national numbers', async () => {
			const input = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement | null;
			expect(input).toBeTruthy();
			await userEvent.click(input as HTMLInputElement);
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, '2025550123');
			await waitFor(() => {
				expect((queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement).value).toBe(
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
				rules: [{ type: 'required', message: 'Phone number is required' }],
			},
			{ $type: 'submit', id: 'submit', name: 'submit', label: 'Submit' },
		]),
	},
	play: async (context: StoryContext) => {
		await waitForPhoneReady(context.canvasElement);
		await createValidationFieldPlay(/phone number/i, '2025550123', /submit/i, /phone number is required/i)(context);
	},
};

export const ArrowCountrySelection: Story = {
	play: async ({ canvasElement, step }: StoryContext) => {
		await waitForPhoneReady(canvasElement);
		const host = queryDeep(canvasElement, 'se-phone-input') as HTMLElement;

		await step('Arrow keys move the active country and Enter selects it', async () => {
			expect(host.getAttribute('data-country')).toBe('US');
			await userEvent.click(within(canvasElement).getByRole('combobox', { name: /country/i }));
			await userEvent.keyboard('{ArrowDown}');

			const active = await waitFor(() => {
				const option = queryDeep(canvasElement, '[role="option"][data-active]') as HTMLElement | null;
				expect(option).toBeTruthy();
				return option as HTMLElement;
			});

			if (active.getAttribute('data-value') === 'US') {
				await userEvent.keyboard('{ArrowDown}');
			}

			const selected = await waitFor(() => {
				const option = queryDeep(canvasElement, '[role="option"][data-active]') as HTMLElement | null;
				expect(option?.getAttribute('data-value')).toBeTruthy();
				expect(option?.getAttribute('data-value')).not.toBe('US');
				return option?.getAttribute('data-value') as string;
			});

			await userEvent.keyboard('{Enter}');
			await waitFor(() => {
				expect(host.getAttribute('data-country')).toBe(selected);
			});
		});
	},
};

export const CallingCodeCountry: Story = {
	play: async ({ canvasElement, step }: StoryContext) => {
		await waitForPhoneReady(canvasElement);
		const host = queryDeep(canvasElement, 'se-phone-input') as HTMLElement;

		await step('Typing an international prefix selects that country', async () => {
			expect(host.getAttribute('data-country')).toBe('US');
			const input = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement | null;
			expect(input).toBeTruthy();
			await userEvent.click(input as HTMLInputElement);
			await userEvent.clear(input as HTMLInputElement);
			await userEvent.type(input as HTMLInputElement, '+44', { delay: 20 });
			await waitFor(() => {
				expect(host.getAttribute('data-country')).toBe('GB');
			});
			await waitFor(() => {
				const visible = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement;
				const stored = queryDeep(canvasElement, '[data-ref="control"]') as HTMLInputElement;
				expect(visible.value).toContain('+44');
				expect(stored.value).toBe('+44');
			});

			await userEvent.type(input as HTMLInputElement, '20');
			await waitFor(() => {
				const visible = queryDeep(canvasElement, '[data-ref="number"]') as HTMLInputElement;
				const stored = queryDeep(canvasElement, '[data-ref="control"]') as HTMLInputElement;
				expect(visible.value).not.toContain('+');
				expect(stored.value.startsWith('+44')).toBe(true);
			});
		});
	},
};
