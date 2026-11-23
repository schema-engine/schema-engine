import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';

export const textRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

export const engine = createFormEngine({ elements: [textRegistration] });
