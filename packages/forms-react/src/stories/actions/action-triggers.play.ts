import { expect, within, userEvent, waitFor } from 'storybook/test';
import type { StoryContext } from '@storybook/react';

export const realtimeDashboardPlay = async ({ canvasElement, step }: StoryContext<any>) => {
	const canvas = within(canvasElement);

	await step('Form mounts and triggers form_mount event', async () => {
		const formTitle = await canvas.findByText(/Action Triggers Interactive Demo/i);
		await expect(formTitle).toBeInTheDocument();

		const mountBadge = await canvas.findByText(/form_mount/i);
		await expect(mountBadge).toBeInTheDocument();
	});

	await step('Type in name field triggers form_change events', async () => {
		const nameInput = canvas.getByPlaceholderText(/Type to trigger form_change/i);
		await userEvent.type(nameInput, 'John Doe', { delay: 50 });

		const changeBadges = await canvas.findAllByText(/form_change/i);
		await expect(changeBadges.length).toBeGreaterThan(0);
	});

	await step('Type invalid email shows validation error', async () => {
		const emailInput = canvas.getByPlaceholderText(/Enter your email/i);
		await userEvent.type(emailInput, 'notanemail', { delay: 50 });

		emailInput.blur();

		const errorMessage = await canvas.findByText('Valid email required', {}, { timeout: 2000 });
		await expect(errorMessage).toBeInTheDocument();
	});

	await step('Fix email to be valid', async () => {
		const emailInput = canvas.getByPlaceholderText(/Enter your email/i);
		await userEvent.clear(emailInput);
		await userEvent.type(emailInput, 'john@example.com', { delay: 50 });

		const changeBadges = await canvas.findAllByText(/form_change/i);
		await expect(changeBadges.length).toBeGreaterThanOrEqual(5);
	});

	await step('Toggle checkbox triggers form_change event', async () => {
		const checkbox = canvas.getByRole('checkbox', { name: /Subscribe to newsletter/i });
		await userEvent.click(checkbox);

		const changeEvents = await canvas.findAllByText(/form_change/i);
		await expect(changeEvents.length).toBeGreaterThanOrEqual(5);
	});

	await step('Submit form triggers submit events', async () => {
		const submitButton = canvas.getByRole('button', { name: /Submit Form/i });
		await userEvent.click(submitButton);

		const submitStartBadges = await canvas.findAllByText(/form_submit_start/i, {}, { timeout: 3000 });
		await expect(submitStartBadges.length).toBeGreaterThan(0);

		const submitSuccessBadges = await canvas.findAllByText(/form_submit_success/i, {}, { timeout: 3000 });
		await expect(submitSuccessBadges.length).toBeGreaterThan(0);

		const submitCompleteBadges = await canvas.findAllByText(/form_submit_complete/i, {}, { timeout: 3000 });
		await expect(submitCompleteBadges.length).toBeGreaterThan(0);
	});

	await step('Verify submit is successful', async () => {
		const eventsTitle = await canvas.findByText(/Events by Trigger/i);
		await expect(eventsTitle).toBeInTheDocument();

		const submitStartGroups = await canvas.findAllByText(/form_submit_start/i);
		await expect(submitStartGroups.length).toBeGreaterThan(0);

		const actionDashboard = await canvas.findByTestId('action-dashboard');
		await expect(actionDashboard).toBeInTheDocument();

		await waitFor(
			async () => {
				const submitSuccess = await within(actionDashboard).findByTestId('form_submit_success');
				const submitComplete = await within(actionDashboard).findByTestId('form_submit_complete');
				const formSubmit = await within(actionDashboard).findByTestId('form_submit');

				await expect(formSubmit).toBeVisible();
				await expect(submitComplete).toBeVisible();
				await expect(submitSuccess).toBeVisible();
			},
			{ timeout: 1000 },
		);
	});

	// await step('Reset', async () => {
	// 	const resetForm = canvas.getByRole('button', { name: /Reset Form/i });
	// 	await new Promise((resolve) => setTimeout(resolve, 500));
	// 	await userEvent.click(resetForm);
	// 	resetForm.blur();
	// });
};
