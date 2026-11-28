import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';

describe('forms package export contract', () => {
	test('createFormEngine rejects an unregistered defaultWizardRecipe from the published package', () => {
		expect(() => createFormEngine({ defaultWizardRecipe: 'missing' })).toThrow(/defaultWizardRecipe/);
	});

	test('createFormEngine is callable from the published package', () => {
		const engine = createFormEngine();
		expect(engine.elements.keys()).toEqual([]);
	});
});
