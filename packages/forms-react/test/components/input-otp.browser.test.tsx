import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { expect, test } from 'vitest';
import { createFormEngine, validateFormValues } from '@schema-engine/forms';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import { InputOTPElementRegistration } from '@/components/schema-engine/forms/inputs/form-input-otp.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import { FormRenderer } from '@/components/internals/form-renderer';

const engine = createFormEngine({ elements: [InputOTPElementRegistration, SubmitButtonElementRegistration] });
const code = { $type: 'input-otp', id: 'code', name: 'code', label: 'Code', length: 6 };

function configWith(element: Record<string, unknown>) {
	return engine.validateForm({
		id: 'otp-form',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [element, { $type: 'submit', id: 'submit', name: 'go', label: 'Submit' }],
			},
		],
	});
}

async function incompleteCodeError(element: Record<string, unknown>) {
	const config = configWith(element);
	const { issues } = await validateFormValues({
		steps: config.steps,
		values: { code: '123' },
		registry: createDefaultValidationRegistry(),
		debounceScope: createDebounceScope(),
	});
	return issues.code?.[0]?.message;
}

test('headless validation rejects an incomplete code and accepts an empty or complete one', async () => {
	expect(await incompleteCodeError(code)).toBe('Enter all 6 characters');

	const config = configWith(code);
	const check = async (value: string) =>
		(
			await validateFormValues({
				steps: config.steps,
				values: { code: value },
				registry: createDefaultValidationRegistry(),
				debounceScope: createDebounceScope(),
			})
		).issues;
	expect(await check('')).toEqual({});
	expect(await check('123456')).toEqual({});
});

test('the incomplete-code message is configurable and an authored length rule replaces the default', async () => {
	expect(await incompleteCodeError({ ...code, incompleteMessage: 'Finish the code' })).toBe('Finish the code');
	expect(
		await incompleteCodeError({ ...code, rules: [{ $type: 'minLength', value: 2, message: 'Too short' }] }),
	).toBeUndefined();
});

test('the React OTP shows the incomplete-code error on submit', async () => {
	render(<FormRenderer config={configWith(code)} engine={engine} />);

	await userEvent.type(screen.getByRole('textbox'), '123');
	await userEvent.click(screen.getByRole('button', { name: /submit/i }));

	expect(await screen.findByText('Enter all 6 characters')).toBeTruthy();
});
