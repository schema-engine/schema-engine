import { expect, waitFor, within } from 'storybook/test';
import { queryByTextContentDeep, queryDeep } from '@/lib/dom-utils';
import type { StoryContext } from 'storybook/internal/types';
import {
	clickNamedButton,
	clickSubmit,
	expectFieldError,
	expectNoFieldError,
	getFieldControl,
	playCheckboxByLabel,
	playFieldFocusAndType,
	playOtpValue,
	playSelectOption,
	playSliderToValue,
} from './play';

function readControlValue(input: HTMLElement): string {
	return 'value' in input ? String((input as HTMLInputElement).value) : '';
}

export function createDefaultFieldPlay(label: string | RegExp, value: string, expectedValue: string | RegExp = value) {
	return async ({ canvasElement, step }: StoryContext) => {
		await step('Field is visible and accepts input', async () => {
			const input = getFieldControl(canvasElement, label);
			if (!input.isConnected) {
				throw new Error('Expected field to be in the document');
			}
			await playFieldFocusAndType(canvasElement, label, value);
			const nextValue = readControlValue(input);
			if (expectedValue instanceof RegExp) {
				if (!expectedValue.test(nextValue)) {
					throw new Error(`Expected value to match ${expectedValue}, got "${nextValue}"`);
				}
			} else if (nextValue !== expectedValue) {
				throw new Error(`Expected value "${expectedValue}", got "${nextValue}"`);
			}
		});
	};
}

export function createValidationFieldPlay(
	fieldLabel: string | RegExp,
	fieldValue: string,
	submitLabel: string | RegExp,
	errorMessage: string | RegExp,
	fillField: (canvasElement: HTMLElement) => Promise<void> = (canvasElement) =>
		playFieldFocusAndType(canvasElement, fieldLabel, fieldValue),
) {
	return async ({ canvasElement, step }: StoryContext) => {
		await step('Empty submit shows validation error', async () => {
			await clickSubmit(canvasElement, submitLabel);
			await expectFieldError(canvasElement, errorMessage);
		});

		await step('Valid input clears validation error on submit', async () => {
			await fillField(canvasElement);
			await clickSubmit(canvasElement, submitLabel);
			await expectNoFieldError(canvasElement, errorMessage);
		});
	};
}

export function createLayoutPlay(selectors: string[]) {
	return async ({ canvasElement, step }: StoryContext) => {
		for (const selector of selectors) {
			await step(`Layout contains ${selector}`, async () => {
				await waitFor(() => {
					if (!canvasElement.querySelector(selector)) {
						throw new Error(`Expected ${selector} to be present`);
					}
				});
			});
		}
	};
}

export function createStepperPlay() {
	return async ({ canvasElement, step }: StoryContext) => {
		await step('Next is blocked when step is invalid', async () => {
			await clickNamedButton(canvasElement, /next/i);
			await expectFieldError(canvasElement, /required|at least/i);
			within(canvasElement).getByLabelText(/first name/i);
		});

		await step('Step one fields are visible', async () => {
			within(canvasElement).getByLabelText(/first name/i);
			within(canvasElement).getByLabelText(/last name/i);
		});

		await step('Valid current step advances to step two without those errors', async () => {
			await playFieldFocusAndType(canvasElement, /first name/i, 'Jane');
			await playFieldFocusAndType(canvasElement, /last name/i, 'Doe');
			await clickNamedButton(canvasElement, /next/i);
			await waitFor(() => {
				if (!queryDeep(canvasElement, '[data-se-current-step="1"]')) {
					throw new Error('Expected stepper chrome to move to step 2');
				}
				if (!queryByTextContentDeep(canvasElement, /step\s+2\s+of/i)) {
					throw new Error('Expected step chip to read Step 2 of N');
				}
				within(canvasElement).getByLabelText(/email/i);
			});
			expect(within(canvasElement).queryByLabelText(/first name/i)).toBeNull();
			await expectNoFieldError(canvasElement, /required|valid email|at least/i);
		});
	};
}

export { playCheckboxByLabel, playOtpValue, playSelectOption, playSliderToValue };
