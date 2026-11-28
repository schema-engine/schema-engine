import { expect, userEvent, waitFor } from 'storybook/test';
import type { StoryContext } from 'storybook/internal/types';
import { whenInteractive } from '@/stories/shared/storybook-ssr.js';
import { queryAllDeep, queryByTextContentDeep, queryDeep } from '@/stories/shared/dom-utils.js';
import { clickSubmit, expectFieldError, getFieldControl } from '@/stories/shared/play.js';

function getDashboard(root: ParentNode): HTMLElement {
	const dashboard = queryDeep(root, '[data-testid="action-dashboard"]');
	if (!(dashboard instanceof HTMLElement)) {
		throw new Error('Expected action dashboard to be present');
	}
	return dashboard;
}

function countDashboardTriggers(root: ParentNode, trigger: string): number {
	return queryAllDeep(getDashboard(root), `[data-trigger="${trigger}"]`).length;
}

async function expectDashboardTrigger(root: ParentNode, trigger: string, timeout = 5000): Promise<void> {
	await waitFor(
		async () => {
			await expect(
				queryDeep(getDashboard(root), `[data-testid="${trigger}"]`),
				`Expected ${trigger} in the action dashboard`,
			).toBeTruthy();
		},
		{ timeout },
	);
}

async function typeIntoField(root: ParentNode, label: string | RegExp, value: string): Promise<void> {
	await waitFor(() => {
		getFieldControl(root, label);
	});
	const input = getFieldControl(root, label);
	await userEvent.click(input);
	await userEvent.clear(input);
	await userEvent.type(input, value, { delay: 50 });
}

export const realtimeDashboardPlay = whenInteractive(async ({ canvasElement, step }: StoryContext) => {
	await step('Form mounts and triggers form_mount event', async () => {
		await waitFor(async () => {
			await expect(queryDeep(canvasElement, 'rui-form'), 'Expected rui-form to be present').toBeTruthy();
			await expect(
				queryByTextContentDeep(canvasElement, /Action Triggers Interactive Demo/i),
				'Expected demo title',
			).toBeTruthy();
			await expect(
				queryByTextContentDeep(canvasElement, /form_mount/i),
				'Expected form_mount trigger',
			).toBeTruthy();
		});
	});

	await step('Type in name field triggers form_change events', async () => {
		await typeIntoField(canvasElement, /^name/i, 'John Doe');

		await waitFor(async () => {
			await expect(countDashboardTriggers(canvasElement, 'form_change')).toBeGreaterThan(0);
		});
	});

	await step('Type invalid email shows validation error', async () => {
		await typeIntoField(canvasElement, /^email/i, 'notanemail');
		await clickSubmit(canvasElement, /Submit Form/i);
		await expectFieldError(canvasElement, /valid email required/i);
	});

	await step('Fix email to be valid', async () => {
		await typeIntoField(canvasElement, /^email/i, 'john@example.com');

		await waitFor(async () => {
			await expect(countDashboardTriggers(canvasElement, 'form_change')).toBeGreaterThan(0);
		});
	});

	await step('Toggle checkbox triggers form_change event', async () => {
		await waitFor(() => {
			getFieldControl(canvasElement, /subscribe to newsletter/i);
		});
		await userEvent.click(getFieldControl(canvasElement, /subscribe to newsletter/i));

		await waitFor(async () => {
			await expect(countDashboardTriggers(canvasElement, 'form_change')).toBeGreaterThan(0);
		});
	});

	await step('Submit form triggers submit events', async () => {
		await clickSubmit(canvasElement, /Submit Form/i);

		await expectDashboardTrigger(canvasElement, 'form_submit_start');
		await expectDashboardTrigger(canvasElement, 'form_submit_success');
		await expectDashboardTrigger(canvasElement, 'form_submit_complete');
	});

	await step('Verify submit is successful', async () => {
		await waitFor(async () => {
			await expect(
				queryByTextContentDeep(canvasElement, /Events by Trigger/i),
				'Expected events summary',
			).toBeTruthy();
		});

		await waitFor(
			async () => {
				const actionDashboard = getDashboard(canvasElement);
				await expect(queryDeep(actionDashboard, '[data-testid="form_submit"]')).toBeTruthy();
				await expect(queryDeep(actionDashboard, '[data-testid="form_submit_success"]')).toBeTruthy();
				await expect(queryDeep(actionDashboard, '[data-testid="form_submit_complete"]')).toBeTruthy();
			},
			{ timeout: 3000 },
		);
	});
});
