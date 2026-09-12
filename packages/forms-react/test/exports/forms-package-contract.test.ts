import { describe, expect, test } from 'vitest';
import { createFormEngine, resolveFormRecipe } from '@schema-engine/forms';

describe('forms package export contract', () => {
	test('resolveFormRecipe accepts a getter from the published package', () => {
		const recipe = {
			$type: 'card',
			kind: 'single-step',
			slots: [],
			schema: { '~standard': { version: 1, vendor: 'test', validate: (value: unknown) => ({ value }) } },
			metadata: { name: 'Card', description: 'Card' },
			render: {},
		};

		expect(
			resolveFormRecipe(
				{
					id: 'contact',
					view: { $type: 'card' },
					steps: [{ id: 'main', title: 'Contact', elements: [] }],
				},
				(id) => (id === 'card' ? recipe : undefined),
			),
		).toBe(recipe);
	});

	test('createFormEngine is callable from the published package', () => {
		const engine = createFormEngine();
		expect(engine.getElementIds()).toEqual([]);
	});
});
