import { expect } from 'storybook/test';
import { queryDeep } from '@/stories/shared/dom-utils.js';
import { whenInteractive } from '@/stories/shared/storybook-ssr.js';
import { getFieldControl } from '@/stories/shared/play.js';

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

/**
 * Finds the grid container that lays out the current step's elements.
 *
 * @remarks The renderer always renders the `se-form-grid` container, even in
 * the single-column default.
 */
function findFormGridContainer(root: ParentNode): HTMLElement {
	const container = queryDeep(root, '.se-form-grid');
	if (!(container instanceof HTMLElement)) {
		throw new Error('Expected the form grid container to be rendered');
	}
	return container;
}

/** Counts the resolved column tracks, e.g. "640px 640px" resolves to 2. */
function getGridTrackCount(root: ParentNode): number {
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

export const responsiveColumnsPlay = whenInteractive(async ({ canvasElement, step }) => {
	try {
		await step('On mobile the fields stack in a single column', async () => {
			await setViewportSize({ width: 375, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(1);
			const firstName = getFieldControl(canvasElement, /first name/i);
			const lastName = getFieldControl(canvasElement, /last name/i);
			await expectControlsStacked(firstName, lastName);
		});

		await step('On small screens two columns fit side by side', async () => {
			await setViewportSize({ width: 640, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(2);
			const firstName = getFieldControl(canvasElement, /first name/i);
			const lastName = getFieldControl(canvasElement, /last name/i);
			await expectControlsInSameRow(firstName, lastName);
		});

		await step('On desktop all three columns are used', async () => {
			await setViewportSize({ width: 1280, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(3);
			const firstName = getFieldControl(canvasElement, /first name/i);
			const lastName = getFieldControl(canvasElement, /last name/i);
			const email = getFieldControl(canvasElement, /work email/i);
			await expectControlsInSameRow(firstName, lastName);
			await expectControlsInSameRow(lastName, email);
		});
	} finally {
		await resetViewport();
	}
});

export const responsiveFieldSpansPlay = whenInteractive(async ({ canvasElement, step }) => {
	try {
		await step('On mobile every field stacks in a single column', async () => {
			await setViewportSize({ width: 375, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(1);
			const fullName = getFieldControl(canvasElement, /full name/i);
			const email = getFieldControl(canvasElement, /work email/i);
			await expectControlsStacked(fullName, email);
		});

		await step('From tablet up the full name takes the whole row', async () => {
			await setViewportSize({ width: 768, height: 800 });
			await expect(getGridTrackCount(canvasElement)).toBe(2);
			const fullName = getFieldControl(canvasElement, /full name/i);
			const email = getFieldControl(canvasElement, /work email/i);
			await expect(fullName.getBoundingClientRect().width).toBeGreaterThan(email.getBoundingClientRect().width);
		});

		await step('From tablet up the email and phone pair up on the next row', async () => {
			const email = getFieldControl(canvasElement, /work email/i);
			const phone = getFieldControl(canvasElement, /phone number/i);
			await expectControlsInSameRow(email, phone);
		});
	} finally {
		await resetViewport();
	}
});
