import * as z from 'zod/mini';
import { createRegistry, type BaseRegistration } from '@schema-engine/registry';

const defaults: BaseRegistration[] = [
	{ $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } },
	{ $type: 'badge', schema: z.object({ label: z.string() }), metadata: { name: 'Badge' } },
];

const custom: BaseRegistration = {
	$type: 'card',
	schema: z.object({ title: z.string(), tone: z.string() }),
	metadata: { name: 'Tonal card' },
};

export const widgets = createRegistry('Widget', [...defaults, custom]);
