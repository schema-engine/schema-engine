import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { StoryContext } from '@storybook/react';

export async function showsDefaultOptionLabelPlay({ canvasElement }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	await expect(canvas.getByRole('combobox', { name: /frequency/i })).toHaveTextContent('Weekly');
}

export async function showsPickedOptionLabelPlay({ canvasElement }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	const trigger = canvas.getByRole('combobox', { name: /frequency/i });
	await userEvent.click(trigger);
	await userEvent.click(await within(document.body).findByRole('option', { name: 'Monthly' }));
	await waitFor(() => expect(trigger).toHaveTextContent('Monthly'));
	await expect(trigger).not.toHaveTextContent('monthly');
}
