import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { registerFormEngine, resetRegisteredFormEnginesForTests } from '@/registries/active-engine';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';

afterEach(() => {
	resetRegisteredFormEnginesForTests();
	vi.restoreAllMocks();
});

test('tags the ambiguous engine warning once with the Radiant package', () => {
	const output = vi.spyOn(console, 'warn').mockImplementation(() => {});
	registerFormEngine(createFormEngine());
	registerFormEngine(createFormEngine());
	const host = document.createElement('div');

	expect(resolveFormEngine(host)).toBeUndefined();
	expect(resolveFormEngine(host)).toBeUndefined();
	expect(output).toHaveBeenCalledExactlyOnceWith(
		expect.stringContaining('[schema-engine/forms-radiant]'),
		expect.any(String),
		expect.stringContaining('Could not resolve FormEngine for <div>: multiple engines are registered.'),
	);
});
