import { FormComposer } from '@/builder';

new FormComposer().addElement({
	$type: 'broken',
	// @ts-expect-error -- registration schemas must implement Standard Schema
	schema: {},
	metadata: { name: 'Broken', category: 'input' },
	render: () => null,
});
