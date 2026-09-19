import { expect, within } from 'storybook/test';
import type { StoryContext } from '@storybook/react';

function findFormGridContainer(root: HTMLElement): HTMLElement {
	const container = root.querySelector<HTMLElement>('.se-form-grid');
	if (!container) {
		throw new Error('Expected the form grid container to be rendered');
	}
	return container;
}

/** Counts the resolved column tracks, e.g. "640px 640px" resolves to 2. */
function getGridTrackCount(root: HTMLElement): number {
	return getComputedStyle(findFormGridContainer(root)).gridTemplateColumns.split(' ').length;
}

async function expectControlsInSameRow(first: HTMLElement, second: HTMLElement): Promise<void> {
	const firstRect = first.getBoundingClientRect();
	const secondRect = second.getBoundingClientRect();
	const tolerance = Math.min(firstRect.height, secondRect.height) / 2;
	await expect(Math.abs(firstRect.top - secondRect.top)).toBeLessThan(tolerance);
}

async function expectControlsStacked(above: HTMLElement, below: HTMLElement): Promise<void> {
	const aboveRect = above.getBoundingClientRect();
	const belowRect = below.getBoundingClientRect();
	await expect(aboveRect.bottom).toBeLessThanOrEqual(belowRect.top + 1);
}

export async function twoColumnsPerRowPlay({ canvasElement, step }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);

	await step('The step lays its elements out on a two-column grid', async () => {
		await expect(getGridTrackCount(canvasElement)).toBe(2);
	});

	await step('First name and last name share the first row', async () => {
		const firstName = canvas.getByLabelText(/first name/i);
		const lastName = canvas.getByLabelText(/last name/i);
		await expectControlsInSameRow(firstName, lastName);
	});

	await step('Work email wraps to the next row', async () => {
		const firstName = canvas.getByLabelText(/first name/i);
		const email = canvas.getByLabelText(/work email/i);
		await expectControlsStacked(firstName, email);
	});

	await step('Phone number sits next to the email', async () => {
		const email = canvas.getByLabelText(/work email/i);
		const phone = canvas.getByLabelText(/phone number/i);
		await expectControlsInSameRow(email, phone);
	});
}

export async function columnSpansPlay({ canvasElement, step }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);

	await step('The step lays its elements out on a three-column grid', async () => {
		await expect(getGridTrackCount(canvasElement)).toBe(3);
	});

	await step('The project name spans two of the three columns', async () => {
		const projectName = canvas.getByLabelText(/project name/i);
		const owner = canvas.getByLabelText(/owner/i);
		await expect(projectName.getBoundingClientRect().width).toBeGreaterThan(owner.getBoundingClientRect().width);
	});

	await step('The description spans the full row and the submit follows below', async () => {
		const projectName = canvas.getByLabelText(/project name/i);
		const description = canvas.getByLabelText(/description/i);
		const submit = canvas.getByRole('button', { name: /create project/i });
		await expect(description.getBoundingClientRect().width).toBeGreaterThan(
			projectName.getBoundingClientRect().width,
		);
		await expectControlsStacked(description, submit);
	});
}

export async function autoFitColumnsPlay({ canvasElement, step }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);

	await step('Every field keeps at least the minimum column width', async () => {
		for (const label of [/tag name/i, /slug/i, /owner/i, /reviewer/i]) {
			const control = canvas.getByLabelText(label);
			await expect(control.getBoundingClientRect().width).toBeGreaterThanOrEqual(219);
		}
	});
}

export async function rowAndColumnGapPlay({ canvasElement, step }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);

	await step('Fields in the same row are separated by the compact column gap', async () => {
		const street = canvas.getByLabelText(/street/i);
		const city = canvas.getByLabelText(/city/i);
		const columnGap = Math.abs(city.getBoundingClientRect().left - street.getBoundingClientRect().right);
		await expect(columnGap).toBeGreaterThan(4);
		await expect(columnGap).toBeLessThan(12);
	});

	await step('Stacked fields are separated by the loose row gap', async () => {
		const street = canvas.getByLabelText(/street/i);
		const postalCode = canvas.getByLabelText(/postal code/i);
		const rowGap = postalCode.getBoundingClientRect().top - street.getBoundingClientRect().bottom;
		await expect(rowGap).toBeGreaterThan(18);
	});
}
