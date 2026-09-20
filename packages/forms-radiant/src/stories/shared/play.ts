import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { StoryContext } from 'storybook/internal/types';
import { matchesText, queryAllDeep, queryByTextDeep, queryDeep } from '@/stories/shared/dom-utils';
import { isStaticSsrPreview } from '@/stories/shared/storybook-ssr';

export function getRuiForm(root: ParentNode): HTMLElement | null {
	return queryDeep(root, 'rui-form') as HTMLElement | null;
}

export function getFieldControl(root: ParentNode, label: string | RegExp): HTMLElement {
	const canvas = within(root as HTMLElement);
	return canvas.getByLabelText(label);
}

export function getFieldControlByPlaceholder(root: ParentNode, placeholder: string | RegExp): HTMLElement {
	const canvas = within(root as HTMLElement);
	return canvas.getByPlaceholderText(placeholder);
}

export function getSubmitButton(root: ParentNode, name: string | RegExp): HTMLElement {
	const canvas = within(root as HTMLElement);
	return canvas.getByRole('button', { name });
}

function waitForFormDecision(root: ParentNode): Promise<void> {
	const ruiForm = queryDeep(root, 'rui-form');
	if (!ruiForm) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		const finish = () => resolve();
		ruiForm.addEventListener('rui-invalid', finish, { once: true });
		ruiForm.addEventListener('rui-submit', finish, { once: true });
		window.setTimeout(finish, 2000);
	});
}

export async function clickNamedButton(root: ParentNode, name: string | RegExp): Promise<void> {
	await waitFor(
		async () => {
			await expect(getSubmitButton(root, name), `Expected control matching ${String(name)}`).toBeTruthy();
		},
		{ timeout: 5000 },
	);
	await userEvent.click(getSubmitButton(root, name));
}

export async function clickSubmit(root: ParentNode, name: string | RegExp): Promise<void> {
	await waitFor(
		async () => {
			await expect(queryDeep(root, 'rui-form'), 'Expected rui-form to be present').toBeTruthy();
			await expect(queryDeep(root, 'rui-field, se-field'), 'Expected rui-field to be present').toBeTruthy();
			await expect(getSubmitButton(root, name), `Expected submit control matching ${String(name)}`).toBeTruthy();
		},
		{ timeout: 5000 },
	);

	const settled = waitForFormDecision(root);
	await userEvent.click(getSubmitButton(root, name));
	await settled;
}

function findVisibleFieldError(root: ParentNode, message: string | RegExp): Element | null {
	for (const element of queryAllDeep(root, '[data-rui-field-error]')) {
		if (element instanceof HTMLElement && element.hidden) {
			continue;
		}
		if (matchesText(element.textContent ?? '', message)) {
			return element;
		}
	}

	return queryByTextDeep(root, message);
}

export async function expectFieldError(root: ParentNode, message: string | RegExp, timeout = 3000): Promise<void> {
	await waitFor(
		async () => {
			await expect(
				findVisibleFieldError(root, message),
				`Expected visible field error matching ${String(message)}`,
			).toBeTruthy();
		},
		{ timeout },
	);
}

export async function expectNoFieldError(root: ParentNode, message: string | RegExp, timeout = 2000): Promise<void> {
	await waitFor(
		async () => {
			await expect(
				findVisibleFieldError(root, message),
				`Expected no field error matching ${String(message)}`,
			).toBeFalsy();
		},
		{ timeout },
	);
}

/**
 * Focus a field control, clear it, and type a value, then blur.
 *
 * @remarks Blurring mirrors a real user moving focus before submitting (e.g.
 * clicking the submit button). Controls such as `rui-number-field` commit their
 * draft value on blur, so the submitted form must observe the committed value,
 * not the draft.
 */
export async function playFieldFocusAndType(
	canvasElement: HTMLElement,
	label: string | RegExp,
	value: string,
): Promise<void> {
	const input = getFieldControl(canvasElement, label);
	await userEvent.click(input);
	await userEvent.clear(input);
	await userEvent.type(input, value);
	input.blur();
}

export async function playSelectOption(
	root: ParentNode,
	fieldLabel: string | RegExp,
	optionLabel: string | RegExp,
): Promise<void> {
	const canvas = within(root as HTMLElement);
	const trigger = canvas.getByRole('combobox', { name: fieldLabel });
	await userEvent.click(trigger);
	await userEvent.keyboard('{ArrowDown}');
	const option = await waitFor(() => within(document.body).getByRole('option', { name: optionLabel }));
	await userEvent.click(option);
}

export async function playClearSelection(root: ParentNode): Promise<void> {
	const canvas = within(root as HTMLElement);
	const clear = await waitFor(() => canvas.getByRole('button', { name: /clear selection/i }));
	await userEvent.click(clear);
}

export async function playCheckboxByLabel(root: ParentNode, label: string | RegExp): Promise<void> {
	const canvas = within(root as HTMLElement);
	await userEvent.click(canvas.getByRole('checkbox', { name: label }));
}

export async function playOtpValue(root: ParentNode, value: string): Promise<void> {
	for (let index = 0; index < value.length; index += 1) {
		const slot = queryDeep(root, `[data-otp-index="${index}"]`) as HTMLInputElement | null;
		if (!slot) {
			throw new Error(`OTP input slot ${index} not found`);
		}
		await userEvent.clear(slot);
		await userEvent.type(slot, value[index] ?? '');
	}
}

export async function playSliderToValue(root: ParentNode, label: string | RegExp, value: number): Promise<void> {
	const slider = within(root as HTMLElement).getByRole('slider', { name: label });
	slider.focus();
	const current = Number(slider.getAttribute('aria-valuenow') ?? slider.getAttribute('value') ?? 0);
	const steps = value - current;
	const key = steps >= 0 ? '{ArrowRight}' : '{ArrowLeft}';
	for (let index = 0; index < Math.abs(steps); index += 1) {
		await userEvent.keyboard(key);
	}
}

export async function playEmptySubmitShowsError(
	canvasElement: HTMLElement,
	submitLabel: string | RegExp,
	errorMessage: string | RegExp,
): Promise<void> {
	await clickSubmit(canvasElement, submitLabel);
	await expectFieldError(canvasElement, errorMessage);
}

export async function playValidSubmitClearsError(
	canvasElement: HTMLElement,
	fieldLabel: string | RegExp,
	fieldValue: string,
	submitLabel: string | RegExp,
	errorMessage: string | RegExp,
): Promise<void> {
	await playEmptySubmitShowsError(canvasElement, submitLabel, errorMessage);
	await playFieldFocusAndType(canvasElement, fieldLabel, fieldValue);
	await clickSubmit(canvasElement, submitLabel);
	await expectNoFieldError(canvasElement, errorMessage);
}

export async function playContactFormValidation({ canvasElement, step }: StoryContext): Promise<void> {
	if (isStaticSsrPreview(canvasElement)) return;
	await step('Empty submit shows required errors', async () => {
		await clickSubmit(canvasElement, /send message/i);
		await expectFieldError(canvasElement, /name is required/i);
		await expectFieldError(canvasElement, /email is required|invalid email/i);
	});

	await step('Valid values submit without those errors', async () => {
		await playFieldFocusAndType(canvasElement, /full name/i, 'Jane Doe');
		await playFieldFocusAndType(canvasElement, /email/i, 'jane@example.com');
		await clickSubmit(canvasElement, /send message/i);
		await expectNoFieldError(canvasElement, /name is required/i);
		await expectNoFieldError(canvasElement, /email is required/i);
		await expectNoFieldError(canvasElement, /invalid email/i);
	});
}

export { matchesText, queryByTextDeep, queryDeep };
