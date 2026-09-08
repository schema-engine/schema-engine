import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { createFormEngine } from '@schema-engine/forms';
import { renderRegisteredElement } from '@/components/internals/render-registered-element';

const countSchema = z.object({
	$type: z.literal('count'),
	id: z.string(),
	name: z.string(),
	count: z.string().transform((value) => Number(value)),
});

function createCountEngine() {
	return createFormEngine({
		elements: [
			{
				$type: 'count',
				schema: countSchema,
				metadata: { name: 'Count', category: 'input' },
				render: (props: { count: number; $type: 'count' }) => {
					if (props.$type !== 'count') {
						throw new Error(`expected $type count, received ${String(props.$type)}`);
					}
					if (typeof props.count !== 'number') {
						throw new Error(`expected numeric count, received ${typeof props.count}`);
					}
					return { tag: 'count', count: props.count };
				},
			},
		],
	});
}

function treeContainsCount(node: unknown, count: number): boolean {
	if (node === null || typeof node !== 'object') return false;
	const record = node as Record<string, unknown>;
	if (record.tag === 'count' && record.count === count) return true;
	for (const value of Object.values(record)) {
		if (treeContainsCount(value, count)) {
			return true;
		}
	}
	return false;
}

describe('Radiant transformed field rendering', () => {
	test('normalized form fields render without reparsing', () => {
		const engine = createCountEngine();
		const config = engine.defineForm({
			id: 'count-form',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'count', id: 'count', name: 'count', count: '7' }],
				},
			],
		});

		expect(treeContainsCount(renderRegisteredElement(config.steps[0]!.elements[0]!, engine), 7)).toBe(true);
	});

	test('standalone fields use validateElement before render', () => {
		const engine = createCountEngine();
		const normalized = engine.validateElement({
			$type: 'count',
			id: 'count',
			name: 'count',
			count: '7',
		});

		expect(treeContainsCount(renderRegisteredElement(normalized, engine), 7)).toBe(true);
	});
});
