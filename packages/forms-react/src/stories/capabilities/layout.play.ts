import { expect, within } from 'storybook/test';
import type { StoryContext } from '@storybook/react';

type ViewportSize = { width: number; height: number };

interface TestViewportGlobal {
	__seTestViewport?: (size: ViewportSize | null) => Promise<void>;
}

async function setViewportSize(size: ViewportSize): Promise<void> {
	const helper = (globalThis as unknown as TestViewportGlobal).__seTestViewport;
	if (!helper) return;
	await helper(size);
}

/**
 * Resizes back to the initial viewport so other stories in the file are not
 * measured at the wrong width.
 */
async function resetViewport(): Promise<void> {
	const helper = (globalThis as unknown as TestViewportGlobal).__seTestViewport;
	if (!helper) return;
	await helper(null);
}

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

export async function responsiveColumnsPlay({ canvasElement, step }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	try {
		await step('On mobile the fields stack in a single column', async () => {
			await setViewportSize({ width: 375, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(1);
			const firstName = canvas.getByLabelText(/first name/i);
			const lastName = canvas.getByLabelText(/last name/i);
			await expectControlsStacked(firstName, lastName);
		});

		await step('On small screens two columns fit side by side', async () => {
			await setViewportSize({ width: 640, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(2);
			const firstName = canvas.getByLabelText(/first name/i);
			const lastName = canvas.getByLabelText(/last name/i);
			await expectControlsInSameRow(firstName, lastName);
		});

		await step('On desktop all three columns are used', async () => {
			await setViewportSize({ width: 1280, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(3);
			const firstName = canvas.getByLabelText(/first name/i);
			const lastName = canvas.getByLabelText(/last name/i);
			const email = canvas.getByLabelText(/work email/i);
			await expectControlsInSameRow(firstName, lastName);
			await expectControlsInSameRow(lastName, email);
		});
	} finally {
		await resetViewport();
	}
}

export async function responsiveFieldSpansPlay({ canvasElement, step }: StoryContext): Promise<void> {
	const canvas = within(canvasElement);
	try {
		await step('On mobile every field stacks in a single column', async () => {
			await setViewportSize({ width: 375, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(1);
			const fullName = canvas.getByLabelText(/full name/i);
			const email = canvas.getByLabelText(/work email/i);
			await expectControlsStacked(fullName, email);
		});

		await step('From tablet up the full name takes the whole row', async () => {
			await setViewportSize({ width: 768, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(2);
			const fullName = canvas.getByLabelText(/full name/i);
			const email = canvas.getByLabelText(/work email/i);
			await expect(fullName.getBoundingClientRect().width).toBeGreaterThan(email.getBoundingClientRect().width);
		});

		await step('From tablet up the email and phone pair up on the next row', async () => {
			const email = canvas.getByLabelText(/work email/i);
			const phone = canvas.getByLabelText(/phone number/i);
			await expectControlsInSameRow(email, phone);
		});
	} finally {
		await resetViewport();
	}
}
