import { createRegistry, exportTreeSchema, type BaseRegistration } from '@schema-engine/registry';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import {
	ArrayElementContract,
	CheckboxElementContract,
	FieldSetContract,
	InputElementContract,
} from '@/default-elements';
import { isZodType } from '@/lib/is-zod-type';

/**
 * The tree of container elements, exported by the registry in place of `withExportedChildren`: the elements the
 * forms engine registers, with the `elements` key declared as the one child path of each container.
 */
describe('exportTreeSchema with the elements of forms', () => {
	const elements = createRegistry<BaseRegistration>('Element', [
		{ ...FieldSetContract, childPaths: [{ keys: ['elements'] }] },
		{ ...ArrayElementContract, childPaths: [{ keys: ['elements'] }] },
		InputElementContract,
		CheckboxElementContract,
	]);
	const document = exportTreeSchema(elements, {
		resolve: (schema, { io, target }) => (isZodType(schema) ? z.toJSONSchema(schema, { io, target }) : undefined),
	});
	const everyElement = elements.keys().map((type) => ({ $ref: `#/$defs/${type}` }));

	test('types the elements of a container as any element, and keeps what its schema says about the list', () => {
		const fieldSet = (
			document.$defs as Record<string, { properties: Record<string, unknown>; required?: string[] }>
		).fieldSet!;

		expect(fieldSet.properties.elements).toEqual({
			type: 'array',
			description: 'Field definitions for the nested object',
			minItems: 1,
			items: { anyOf: everyElement },
		});
		expect(fieldSet.required).toContain('elements');
		expect(fieldSet.properties.legend).toMatchObject({ type: 'string' });
	});

	test('lists every element as the root and as a definition', () => {
		expect(document.anyOf).toEqual(everyElement);
		expect(Object.keys(document.$defs as object)).toEqual(elements.keys());
	});

	test('leaves a leaf element as its own schema writes it', () => {
		const input = (document.$defs as Record<string, { properties: Record<string, unknown> }>).input!;

		expect(input.properties.$type).toMatchObject({ const: 'input' });
	});
});
