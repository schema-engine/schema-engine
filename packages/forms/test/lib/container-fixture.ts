import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import { anyValue } from '../lib/any-value';

const engine = createFormEngine({
	elements: [
		defineInput({
			value: anyValue,
			$type: 'input',
			schema: z.looseObject({ $type: z.literal('input') }),
			metadata: { name: 'Input', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
		defineInput({
			childPaths: [{ keys: ['elements'], list: true }],
			$type: 'arrayElements',
			containerKind: 'array',
			schema: z.looseObject({
				$type: z.literal('arrayElements'),
				elements: z.optional(z.array(z.looseObject({ $type: z.string() }))),
			}),
			metadata: { name: 'Array', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
		defineInput({
			childPaths: [{ keys: ['elements'], list: true }],
			$type: 'fieldSet',
			containerKind: 'object',
			schema: z.looseObject({
				$type: z.literal('fieldSet'),
				elements: z.optional(z.array(z.looseObject({ $type: z.string() }))),
			}),
			metadata: { name: 'Fieldset', category: 'input' },
			render: (_props: Record<string, unknown>) => null,
		}),
	],
});
export const normalizeContainerFixture = (value: unknown) => engine.validateElement(value);
