import { expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { FormInstance } from '@/components/form-instance';
import { defineRecipe } from '@/primitives';
import { createRadiantFormEngine } from '@/registries';

const ghost = defineRecipe(
	defineRecipeSpec({
		$type: 'ghost',
		kind: 'single-step',
		metadata: { name: 'Ghost', description: 'A view the rendering engine does not register' },
	}),
	{ slots: {} },
);

test('FormInstance throws when the config view names a recipe the engine does not register', () => {
	const config = createRadiantFormEngine({ recipes: [ghost] }).validateForm({
		id: 'orphan-view',
		steps: [{ id: 'one', title: 'One', elements: [] }],
		view: { $type: 'ghost' },
	});

	expect(() => FormInstance({ config, engine: createFormEngine({}) })).toThrow(
		"Form 'orphan-view' uses view 'ghost' but the engine has no such recipe.",
	);
});
