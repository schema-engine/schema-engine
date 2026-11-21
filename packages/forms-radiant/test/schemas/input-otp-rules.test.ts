import { expect, test } from 'vitest';
import { createDefaultValidationRegistry } from '@schema-engine/forms/schemas/validation';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';
import { validateFormValues } from '@schema-engine/forms';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
const code = { $type: 'input-otp', id: 'code', name: 'code', label: 'Code', length: 6 };

async function errorFor(element: Record<string, unknown>, value = '123') {
	const config = engine.validateForm({ id: 'otp-form', steps: [{ id: 'main', title: 'Main', elements: [element] }] });
	const errors = await validateFormValues({
		elements: config.steps[0]!.elements,
		values: { code: value },
		registry: createDefaultValidationRegistry(),
		debounceScope: createDebounceScope(),
	});
	return errors.code?.message;
}

test('headless validation rejects an incomplete code and accepts an empty or complete one', async () => {
	expect(await errorFor(code)).toBe('Enter all 6 characters');
	expect(await errorFor(code, '')).toBeUndefined();
	expect(await errorFor(code, '123456')).toBeUndefined();
});

test('the incomplete-code message is configurable and an authored length rule replaces the default', async () => {
	expect(await errorFor({ ...code, incompleteMessage: 'Finish the code' })).toBe('Finish the code');
	expect(await errorFor({ ...code, rules: [{ type: 'minLength', value: 2, message: 'Too short' }] })).toBeUndefined();
});
