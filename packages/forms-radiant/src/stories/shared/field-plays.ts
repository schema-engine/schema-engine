import type { StoryContext } from 'storybook/internal/types';
import {
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

export { playCheckboxByLabel, playOtpValue, playSelectOption, playSliderToValue };
