import { expect, within } from 'storybook/test';
import { queryDeep } from '@/stories/shared/dom-utils.js';
import { whenInteractive } from '@/stories/shared/storybook-ssr.js';
import { getFieldControl } from '@/stories/shared/play.js';

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

export const twoColumnsPerRowPlay = whenInteractive(async ({ canvasElement, step }) => {
	await step('The step lays its elements out on a two-column grid', async () => {
		await expect(getGridTrackCount(canvasElement)).toBe(2);
	});

	await step('First name and last name share the first row', async () => {
		const firstName = getFieldControl(canvasElement, /first name/i);
		const lastName = getFieldControl(canvasElement, /last name/i);
		await expectControlsInSameRow(firstName, lastName);
	});

	await step('Work email wraps to the next row', async () => {
		const firstName = getFieldControl(canvasElement, /first name/i);
		const email = getFieldControl(canvasElement, /work email/i);
		await expectControlsStacked(firstName, email);
	});

	await step('Phone number sits next to the email', async () => {
		const email = getFieldControl(canvasElement, /work email/i);
		const phone = getFieldControl(canvasElement, /phone number/i);
		await expectControlsInSameRow(email, phone);
	});
});

export const columnSpansPlay = whenInteractive(async ({ canvasElement, step }) => {
	await step('The step lays its elements out on a three-column grid', async () => {
		await expect(getGridTrackCount(canvasElement)).toBe(3);
	});

	await step('The project name spans two of the three columns', async () => {
		const projectName = getFieldControl(canvasElement, /project name/i);
		const owner = getFieldControl(canvasElement, /owner/i);
		await expect(projectName.getBoundingClientRect().width).toBeGreaterThan(owner.getBoundingClientRect().width);
	});

	await step('The description spans the full row and the submit follows below', async () => {
		const canvas = within(canvasElement);
		const projectName = getFieldControl(canvasElement, /project name/i);
		const description = getFieldControl(canvasElement, /description/i);
		const submit = canvas.getByRole('button', { name: /create project/i });
		await expect(description.getBoundingClientRect().width).toBeGreaterThan(
			projectName.getBoundingClientRect().width,
		);
		await expectControlsStacked(description, submit);
	});
});

export const autoFitColumnsPlay = whenInteractive(async ({ canvasElement, step }) => {
	await step('Every field keeps at least the minimum column width', async () => {
		for (const label of [/tag name/i, /slug/i, /owner/i, /reviewer/i]) {
			const control = getFieldControl(canvasElement, label);
			await expect(control.getBoundingClientRect().width).toBeGreaterThanOrEqual(219);
		}
	});
});

export const rowAndColumnGapPlay = whenInteractive(async ({ canvasElement, step }) => {
	await step('Fields in the same row are separated by the compact column gap', async () => {
		const street = getFieldControl(canvasElement, /street/i);
		const city = getFieldControl(canvasElement, /city/i);
		const columnGap = Math.abs(city.getBoundingClientRect().left - street.getBoundingClientRect().right);
		await expect(columnGap).toBeGreaterThan(4);
		await expect(columnGap).toBeLessThan(14);
	});

	await step('Stacked fields are separated by the loose row gap', async () => {
		const street = getFieldControl(canvasElement, /street/i);
		const postalCode = getFieldControl(canvasElement, /postal code/i);
		const rowGap = postalCode.getBoundingClientRect().top - street.getBoundingClientRect().bottom;
		await expect(rowGap).toBeGreaterThan(18);
	});
});
