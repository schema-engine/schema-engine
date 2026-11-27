import * as z from 'zod/mini';
import { bindRegistry, createRegistry } from '@schema-engine/registry';

const contracts = createRegistry('Widget', [
	{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } },
	{ $type: 'badge', schema: z.object({ label: z.string() }), metadata: { name: 'Badge' } },
]);

export const reactWidgets = bindRegistry(contracts, {
	card: { render: (props: { title: string }) => `<h1>${props.title}</h1>` },
	badge: { render: (props: { label: string }) => `<b>${props.label}</b>` },
});

export const radiantWidgets = bindRegistry(contracts, {
	card: { tag: 'se-card' },
	badge: { tag: 'se-badge' },
});
