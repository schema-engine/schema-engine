import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { elementChildrenSchema } from '@/lib/element-children';
import { defineInput } from '@/types';
import { anyValue } from './any-value';

const field = defineInput({
	value: anyValue,
	$type: 'field',
	schema: z.looseObject({ $type: z.literal('field'), id: z.string(), name: z.string() }),
	metadata: { name: 'Field', category: 'input' },
	render: () => null,
});

const oneChild = z.looseObject({ $type: z.string() });

/** A container whose schema lets `elements` be a list or one child, which the registry's tree walk accepts. */
const lenient = defineInput({
	$type: 'lenient',
	schema: z.looseObject({
		$type: z.literal('lenient'),
		id: z.string(),
		elements: z.union([elementChildrenSchema, oneChild]),
	}),
	childPaths: [{ keys: ['elements'] }],
	metadata: { name: 'Lenient', category: 'input' },
	render: () => null,
});

const engine = createFormEngine({ elements: [field, lenient] });
const formWith = (elements: unknown[]) => ({ id: 'tree', steps: [{ id: 'main', title: 'Main', elements }] });
const child = { $type: 'field', id: 'a', name: 'a' };

describe('the elements of a container are a list', () => {
	test('an object where the list goes is an issue at the elements key, and no child is silently dropped', () => {
		const result = engine.safeValidateForm(formWith([{ $type: 'lenient', id: 'l', elements: child }]));

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues).toEqual([
			expect.objectContaining({
				path: ['steps', 0, 'elements', 0, 'elements'],
				message: "Element 'lenient' must hold its elements as a list.",
			}),
		]);
	});

	test('a list is as valid as before', () => {
		expect(engine.safeValidateForm(formWith([{ $type: 'lenient', id: 'l', elements: [child] }])).success).toBe(
			true,
		);
	});

	test('a container without elements is not an issue of this check', () => {
		const optional = defineInput({
			$type: 'optional',
			schema: z.looseObject({
				$type: z.literal('optional'),
				id: z.string(),
				elements: z.optional(elementChildrenSchema),
			}),
			childPaths: [{ keys: ['elements'] }],
			metadata: { name: 'Optional', category: 'input' },
			render: () => null,
		});
		const withOptional = createFormEngine({ elements: [field, optional] });

		expect(withOptional.safeValidateForm(formWith([{ $type: 'optional', id: 'o' }])).success).toBe(true);
	});
});
