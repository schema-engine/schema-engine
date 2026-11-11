import { expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { FormArrayElements } from '@/elements/inputs/form-array-elements';

test('serializes the seeded rows it rendered when the caller passes no ssrInitialRows', () => {
	const html = withRadiantServerCustomElementRenderBridge(() =>
		renderToString(
			FormArrayElements({
				id: 'contacts',
				name: 'contacts',
				minItems: 2,
				elements: [],
			} as unknown as Parameters<typeof FormArrayElements>[0]),
			{ mode: 'plain' },
		),
	);

	console.log(html);
	console.log(html);
	const serialized = html.match(/ssrInitialRows&quot;:\[([^\]]*)\]/)?.[1] ?? '';
	expect(serialized.split('},{')).toHaveLength(2);
});
