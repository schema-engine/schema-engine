import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';

const engine = createFormEngine({
	elements: [
		defineInput({
			$type: 'input',
			schema: z.looseObject({ $type: z.literal('input') }),
			metadata: { name: 'Input', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
		defineInput({
			$type: 'arrayElements',
			containerKind: 'array',
			schema: z.looseObject({ $type: z.literal('arrayElements') }),
			metadata: { name: 'Array', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
	],
});
export const normalizeContainerFixture = (value: unknown) => engine.validateElement(value);
