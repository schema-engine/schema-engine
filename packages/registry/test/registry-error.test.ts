import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import {
	RegistryError,
	assertStandardSchema,
	bindRegistry,
	createRegistry,
	safeParseStandardSchema,
	type BaseRegistration,
	type ReadOnlyRegistry,
} from '../src';

const card = { $type: 'card', schema: z.object({ title: z.string() }), metadata: { name: 'Card' } };
const badge = { $type: 'badge', schema: z.object({ label: z.string() }), metadata: { name: 'Badge' } };

function thrown(build: () => unknown): unknown {
	try {
		build();
	} catch (error) {
		return error;
	}
	throw new Error('Expected the build to throw');
}

const withPaths = (childPaths: unknown) => ({ ...card, childPaths }) as unknown as BaseRegistration;

describe('RegistryError', () => {
	describe('Scenario: Building a registry fails with a code', () => {
		it("'invalid-schema' names the kind and the $type", () => {
			const error = thrown(() =>
				createRegistry('Widget', [{ ...card, schema: {} } as unknown as BaseRegistration]),
			);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				name: 'RegistryError',
				code: 'invalid-schema',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' schema must implement Standard Schema (~standard.validate).",
			});
		});

		it("'invalid-child-paths' covers a childPaths that is not a list", () => {
			const error = thrown(() => createRegistry('Widget', [withPaths('blocks')]));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'invalid-child-paths',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' childPaths must be a list of key paths.",
			});
		});

		it("'invalid-child-paths' covers an entry that is not a non-empty list of non-empty keys", () => {
			const error = thrown(() => createRegistry('Widget', [withPaths([['blocks', '']])]));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'invalid-child-paths',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' childPaths must hold non-empty lists of non-empty keys.",
			});
		});

		it("'duplicate-child-path' names the repeated path", () => {
			const error = thrown(() =>
				createRegistry('Widget', [
					withPaths([
						['engine', 'controls'],
						['engine', 'controls'],
					]),
				]),
			);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'duplicate-child-path',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' declares the child path 'engine.controls' twice.",
			});
		});

		it("'nested-child-path' names the path and the one it runs through", () => {
			const error = thrown(() => createRegistry('Widget', [withPaths([['engine'], ['engine', 'controls']])]));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'nested-child-path',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' child path 'engine.controls' runs through the child path 'engine'.",
			});
		});

		it("'duplicate-type' names the repeated $type when duplicates is 'error'", () => {
			const error = thrown(() => createRegistry('Widget', [card, card], { duplicates: 'error' }));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'duplicate-type',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' is registered twice.",
			});
		});
	});

	describe('Scenario: Binding a registry fails with a code', () => {
		const contracts: ReadOnlyRegistry<BaseRegistration> = createRegistry<BaseRegistration>('Widget', [card, badge]);
		const bindUnchecked: (
			contracts: ReadOnlyRegistry,
			bindings: Readonly<Record<string, Record<string, unknown>>>,
		) => ReadOnlyRegistry = bindRegistry;

		it("'unknown-binding' carries the key of the binding as $type", () => {
			const error = thrown(() => bindUnchecked(contracts, { card: {}, badge: {}, crad: {} }));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'unknown-binding',
				kind: 'Widget',
				$type: 'crad',
				message: "Widget binding 'crad' names no registration.",
			});
		});

		it("'missing-binding' names the contract without a binding", () => {
			const error = thrown(() => bindUnchecked(contracts, { card: {} }));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'missing-binding',
				kind: 'Widget',
				$type: 'badge',
				message: "Widget 'badge' has no binding.",
			});
		});

		it("'binding-overrides-contract' names the contract whose key the binding sets", () => {
			const error = thrown(() => bindUnchecked(contracts, { card: { schema: z.string() }, badge: {} }));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'binding-overrides-contract',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' binding sets 'schema', which the contract defines.",
			});
		});
	});

	describe('Scenario: assertStandardSchema fails with a code but names no registry', () => {
		it("throws 'invalid-schema' without kind or $type", () => {
			const error = thrown(() => assertStandardSchema({}, "Registration 'x' schema"));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'invalid-schema',
				message: "Registration 'x' schema must implement Standard Schema (~standard.validate).",
			});
			expect((error as RegistryError).kind).toBeUndefined();
			expect((error as RegistryError).$type).toBeUndefined();
		});
	});

	describe('Scenario: Parsing is not building', () => {
		it('leaves an asynchronous Standard Schema a plain Error', () => {
			const asyncSchema = {
				'~standard': { version: 1, vendor: 'test', validate: async () => ({ value: 1 }) },
			} as never;
			const error = thrown(() => safeParseStandardSchema(asyncSchema, 1));

			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(RegistryError);
		});
	});
});
