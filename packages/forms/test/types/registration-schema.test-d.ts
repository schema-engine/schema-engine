import { createFormEngine } from '@/engine/create-form-engine';

createFormEngine({
	elements: [
		{
			$type: 'broken',
			// @ts-expect-error -- registration schemas must implement Standard Schema
			schema: {},
			metadata: { name: 'Broken' },
			render: () => null,
		},
	],
});

// @ts-expect-error -- registrations must be objects with $type and a Standard Schema
createFormEngine({ elements: [123] });

createFormEngine().extend({
	// @ts-expect-error -- recipes must be recipe registrations
	recipes: [false],
});
