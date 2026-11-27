import * as z from 'zod/mini';
import { createRegistry, exportTreeSchema } from '@schema-engine/registry';

const nodes = createRegistry('Node', [
	{
		$type: 'page',
		schema: z.object({ $type: z.literal('page'), sections: z.array(z.unknown()) }),
		metadata: { name: 'Page' },
		childPaths: [{ keys: ['sections'], accepts: ['section'] }],
	},
	{
		$type: 'section',
		schema: z.object({ $type: z.literal('section'), title: z.string() }),
		metadata: { name: 'Section' },
	},
]);

export const documentSchema = exportTreeSchema(nodes, {
	accepts: ['page'],
	resolve: (schema, { io, target }) =>
		schema instanceof z.core.$ZodType ? z.toJSONSchema(schema, { io, target }) : undefined,
});
