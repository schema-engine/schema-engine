import { describe, expect, test } from 'vitest';
import * as v from 'valibot';
import { Schema } from 'effect';
import { createFormEngine } from '@/engine/create-form-engine';

describe('Standard Schema libraries through defineForm', () => {
	test('Valibot defaults and transforms reach the returned form', () => {
		const schema = v.object({
			$type: v.literal('valibot-note'),
			id: v.string(),
			name: v.pipe(v.optional(v.string(), 'untitled'), v.toUpperCase()),
		});

		const engine = createFormEngine({
			elements: [
				{
					$type: 'valibot-note',
					schema,
					metadata: { name: 'Valibot note', category: 'input' },
					render: () => null,
				},
			],
		});

		const withName = engine.defineForm({
			id: 'valibot',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'valibot-note', id: 'n1', name: 'ada' }],
				},
			],
		});
		const withDefault = engine.defineForm({
			id: 'valibot-default',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'valibot-note', id: 'n2' }],
				},
			],
		});

		expect(withName.steps[0]?.elements[0]).toMatchObject({ $type: 'valibot-note', name: 'ADA' });
		expect(withDefault.steps[0]?.elements[0]).toMatchObject({ $type: 'valibot-note', name: 'UNTITLED' });
	});

	test('Effect Schema defaults and transforms reach the returned form', () => {
		const encoded = Schema.Struct({
			$type: Schema.Literal('effect-note'),
			id: Schema.String,
			name: Schema.optionalWith(Schema.String, { default: () => 'untitled' }),
		});
		const decoded = Schema.Struct({
			$type: Schema.Literal('effect-note'),
			id: Schema.String,
			name: Schema.String,
		});
		const schema = Schema.standardSchemaV1(
			Schema.transform(encoded, decoded, {
				decode: (value) => ({ ...value, name: value.name.toUpperCase() }),
				encode: (value) => value,
			}),
		);

		const engine = createFormEngine({
			elements: [
				{
					$type: 'effect-note',
					schema,
					metadata: { name: 'Effect note', category: 'input' },
					render: () => null,
				},
			],
		});

		const withName = engine.defineForm({
			id: 'effect',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'effect-note', id: 'n1', name: 'ada' }],
				},
			],
		});
		const withDefault = engine.defineForm({
			id: 'effect-default',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [{ $type: 'effect-note', id: 'n2' }],
				},
			],
		});

		expect(withName.steps[0]?.elements[0]).toMatchObject({ $type: 'effect-note', name: 'ADA' });
		expect(withDefault.steps[0]?.elements[0]).toMatchObject({ $type: 'effect-note', name: 'UNTITLED' });
	});
});
