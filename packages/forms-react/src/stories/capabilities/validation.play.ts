import { expect, userEvent, within } from 'storybook/test';
import type { StoryContext } from '@storybook/react';

export async function clearsErrorsAfterValidInputPlay({ canvasElement }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	await userEvent.click(canvas.getByRole('button', { name: /continue/i }));
	await expect(await canvas.findByText(/work email is required/i)).toBeInTheDocument();
	const input = canvas.getByLabelText(/work email/i);
	await userEvent.type(input, 'name@example.com');
	await userEvent.click(canvas.getByRole('button', { name: /continue/i }));
	await expect(canvas.queryByText(/work email is required/i)).not.toBeInTheDocument();
}

export async function builtInRulesPlay({ canvasElement }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	const submit = canvas.getByRole('button', { name: /validate fields/i });
	const url = canvas.getByLabelText(/website url/i);
	await userEvent.type(url, 'not a URL');
	await userEvent.click(submit);
	await expect(await canvas.findByText(/enter a valid url/i)).toBeInTheDocument();
	await userEvent.clear(url);
	await userEvent.type(url, 'https://schema-engine.dev');
	await expect(canvas.queryByText(/enter a valid url/i)).not.toBeInTheDocument();
	const ipv4 = canvas.getByLabelText(/server ipv4 address/i);
	await userEvent.type(ipv4, '127.0.0.999');
	await userEvent.click(submit);
	await expect(await canvas.findByText(/enter a valid ipv4 address/i)).toBeInTheDocument();
	await userEvent.clear(ipv4);
	await userEvent.type(ipv4, '127.0.0.1');
	await expect(canvas.queryByText(/enter a valid ipv4 address/i)).not.toBeInTheDocument();
}

export async function formatRulesPlay({ canvasElement }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	const submit = canvas.getByRole('button', { name: /validate formats/i });
	const base64 = canvas.getByLabelText(/base64 value/i);
	await userEvent.type(base64, 'not base64');
	await userEvent.click(submit);
	await expect(await canvas.findByText(/enter base64 data/i)).toBeInTheDocument();
	await userEvent.clear(base64);
	await userEvent.type(base64, 'aGVsbG8=');
	await expect(canvas.queryByText(/enter base64 data/i)).not.toBeInTheDocument();
	const hexadecimal = canvas.getByLabelText(/hexadecimal value/i);
	await userEvent.type(hexadecimal, 'not hexadecimal');
	await userEvent.click(submit);
	await expect(await canvas.findByText(/enter hexadecimal characters/i)).toBeInTheDocument();
	await userEvent.clear(hexadecimal);
	await userEvent.type(hexadecimal, 'deadbeef');
	await expect(canvas.queryByText(/enter hexadecimal characters/i)).not.toBeInTheDocument();
}

export async function asyncUsernameAvailabilityPlay({ canvasElement }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	const submit = canvas.getByRole('button', { name: /check availability/i });
	const username = canvas.getByLabelText(/username/i);
	await userEvent.type(username, 'taken-user');
	await userEvent.click(submit);
	await expect(await canvas.findByText(/that username is unavailable/i)).toBeInTheDocument();
	await userEvent.clear(username);
	await userEvent.type(username, 'available-user');
	await expect(canvas.queryByText(/that username is unavailable/i)).not.toBeInTheDocument();
}
