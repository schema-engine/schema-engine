import { expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormInstance } from '@/components/form-instance';
import { normalizedTestConfig } from '../adapters/test-config';

test('FormInstance throws when the config view names a recipe the engine does not register', () => {
	const config = normalizedTestConfig({
		id: 'orphan-view',
		steps: [{ id: 'one', title: 'One', elements: [] }],
		view: { $type: 'ghost' },
	});

	expect(() => FormInstance({ config, engine: createFormEngine({}) })).toThrow(
		"Form 'orphan-view' uses view 'ghost' but the engine has no such recipe.",
	);
});
