import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { definitionRef, resolveLocalRef } from '../../src/json-schema';

const names = ['element:tab', 'ui/button', 'a~b', 'my type', 'user@host', "a$b&c+d,e;f=g!h'i(j)k*l", '100%', 'a#b'];

describe('definitionRef', () => {
	describe('Scenario: The keyword follows the target', () => {
		it.each([
			['draft-2020-12', '#/$defs/leaf'],
			['draft-07', '#/definitions/leaf'],
			['draft-04', '#/definitions/leaf'],
			['openapi-3.0', '#/definitions/leaf'],
		] as const)('writes %s as %s', (target, ref) => {
			expect(definitionRef(target, 'leaf')).toBe(ref);
		});
	});

	describe('Scenario: The name is a JSON Pointer token written for a URI fragment', () => {
		it.each([
			['element:tab', '#/$defs/element:tab'],
			['ui/button', '#/$defs/ui~1button'],
			['a~b', '#/$defs/a~0b'],
			['my type', '#/$defs/my%20type'],
			['user@host', '#/$defs/user@host'],
			["a$b&c+d,e;f=g!h'i(j)k*l", "#/$defs/a$b&c+d,e;f=g!h'i(j)k*l"],
			['100%', '#/$defs/100%25'],
			['a#b', '#/$defs/a%23b'],
		])('writes %j as %s', (name, ref) => {
			expect(definitionRef('draft-2020-12', name)).toBe(ref);
		});

		it.each(names)('is resolved by Ajv to the definition named %j', (name) => {
			const document = { $defs: { [name]: { type: 'string' } }, $ref: definitionRef('draft-2020-12', name) };
			const legacy = { definitions: { [name]: { type: 'string' } }, $ref: definitionRef('draft-07', name) };
			const validate = new Ajv2020({ strict: false }).compile(document);
			const validateLegacy = new Ajv({ strict: false }).compile(legacy);

			expect([validate('x'), validate(1), validateLegacy('x'), validateLegacy(1)]).toEqual([
				true,
				false,
				true,
				false,
			]);
		});
	});
});

describe('resolveLocalRef', () => {
	it.each(names)('finds the definition that definitionRef wrote a reference to for %j', (name) => {
		const definition = { type: 'string' };

		expect(resolveLocalRef({ $defs: { [name]: definition } }, definitionRef('draft-2020-12', name))).toBe(
			definition,
		);
		expect(resolveLocalRef({ definitions: { [name]: definition } }, definitionRef('draft-07', name))).toBe(
			definition,
		);
	});

	it('reads # as the document and a nested pointer as the schema it names', () => {
		const document = { properties: { a: { type: 'string' } } };

		expect(resolveLocalRef(document, '#')).toBe(document);
		expect(resolveLocalRef(document, '#/properties/a')).toBe(document.properties.a);
	});

	it.each(['#/$defs/missing', 'https://example.com/a', '#/properties/a/type', '#/%E0%A4%A', '#/__proto__'])(
		'is undefined for %s',
		(ref) => {
			expect(resolveLocalRef({ properties: { a: { type: 'string' } } }, ref)).toBeUndefined();
		},
	);
});
