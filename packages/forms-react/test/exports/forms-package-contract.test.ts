import { describe, expect, test } from 'vitest';
import { FormComposer, resolveFormRecipe } from '@schema-engine/forms';

describe('forms package export contract', () => {
	test('resolveFormRecipe accepts a getter from the published package', () => {
		const recipe = {
			$type: 'card',
			kind: 'single-step' as const,
			slots: [],
			schema: { '~standard': { version: 1 as const, vendor: 'test', validate: (value: unknown) => ({ value }) } },
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

	test('FormComposer is constructable from the published package', () => {
		const engine = new FormComposer().build();
		expect(engine.getElementIds()).toEqual([]);
	});
});
