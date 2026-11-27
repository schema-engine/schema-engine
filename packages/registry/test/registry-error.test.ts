import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import {
	RegistryError,
	type RegistryErrorCode,
	assertStandardSchema,
	bindRegistry,
	createRegistry,
	safeParseStandardSchema,
	safeParseTree,
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

/** A registry of one tree node, `card`, whose schema returns whatever `transform` makes of the input. */
function parsing(transform: (input: Record<string, unknown>) => unknown) {
	return createRegistry('Widget', [
		{
			...card,
			schema: {
				'~standard': {
					version: 1,
					vendor: 'test',
					validate: (value: unknown) => ({ value: transform(value as Record<string, unknown>) }),
				},
			},
			childPaths: [{ keys: ['items'] }],
		} as unknown as BaseRegistration,
	]);
}

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
				message: "Widget 'card' childPaths must be a list of child paths.",
			});
		});

		it("'invalid-child-paths' covers an entry whose keys are not a non-empty list of non-empty strings", () => {
			const error = thrown(() => createRegistry('Widget', [withPaths([{ keys: ['blocks', ''] }])]));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'invalid-child-paths',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' childPaths[0].keys must be a non-empty list of non-empty strings.",
			});
		});

		it("'duplicate-child-path' names the repeated path", () => {
			const error = thrown(() =>
				createRegistry('Widget', [
					withPaths([{ keys: ['engine', 'controls'] }, { keys: ['engine', 'controls'] }]),
				]),
			);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'duplicate-child-path',
				kind: 'Widget',
				$type: 'card',
				childPath: ['engine', 'controls'],
				message: "Widget 'card' declares the child path 'engine.controls' twice.",
			});
		});

		it("'nested-child-path' names the path and the one it runs through", () => {
			const error = thrown(() =>
				createRegistry('Widget', [withPaths([{ keys: ['engine'] }, { keys: ['engine', 'controls'] }])]),
			);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'nested-child-path',
				kind: 'Widget',
				$type: 'card',
				childPath: ['engine', 'controls'],
				outerChildPath: ['engine'],
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

	describe('Scenario: Parsing a tree fails with a code when a schema contradicts its registration', () => {
		it("'schema-changes-type' names the kind and the $type", () => {
			const error = thrown(() =>
				safeParseTree(
					parsing(() => ({})),
					{ $type: 'card' },
				),
			);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'schema-changes-type',
				kind: 'Widget',
				$type: 'card',
				message: "Widget 'card' schema output must keep its $type 'card'.",
			});
		});

		it("'schema-breaks-child-path' names the kind, the $type and the child path", () => {
			const error = thrown(() =>
				safeParseTree(
					parsing((input) => ({ $type: input.$type })),
					{ $type: 'card', items: [{ $type: 'card' }] },
				),
			);

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'schema-breaks-child-path',
				kind: 'Widget',
				$type: 'card',
				childPath: ['items'],
				message: "Widget 'card' schema output does not keep the child path 'items' as the document has it.",
			});
		});

		it('leaves kind out when the lookup is no registry, since a function has no label', () => {
			const registry = parsing(() => ({}));
			const error = thrown(() => safeParseTree({ get: (type: string) => registry.get(type) }, { $type: 'card' }));

			expect(error).toBeInstanceOf(RegistryError);
			expect((error as RegistryError).kind).toBeUndefined();
			expect((error as RegistryError).message).toBe("'card' schema output must keep its $type 'card'.");
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

		it("'binding-overrides-contract' names the contract and the key the binding sets", () => {
			const error = thrown(() => bindUnchecked(contracts, { card: { schema: z.string() }, badge: {} }));

			expect(error).toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				code: 'binding-overrides-contract',
				kind: 'Widget',
				$type: 'card',
				key: 'schema',
				message: "Widget 'card' binding sets 'schema', which the contract defines.",
			});
		});
	});

	describe('Scenario: A consumer writes the message again from the code and the details', () => {
		const contracts: ReadOnlyRegistry<BaseRegistration> = createRegistry<BaseRegistration>('Widget', [card, badge]);
		const bindUnchecked: (
			contracts: ReadOnlyRegistry,
			bindings: Readonly<Record<string, Record<string, unknown>>>,
		) => ReadOnlyRegistry = bindRegistry;
		const templates: Record<RegistryErrorCode, (error: RegistryError) => string> = {
			'invalid-schema': (e) =>
				`${e.kind} '${e.$type}' schema must implement Standard Schema (~standard.validate).`,
			'invalid-child-paths': (e) => `${e.kind} '${e.$type}' childPaths must be a list of child paths.`,
			'duplicate-child-path': (e) =>
				`${e.kind} '${e.$type}' declares the child path '${e.childPath?.join('.')}' twice.`,
			'nested-child-path': (e) =>
				`${e.kind} '${e.$type}' child path '${e.childPath?.join('.')}' runs through the child path '${e.outerChildPath?.join('.')}'.`,
			'duplicate-type': (e) => `${e.kind} '${e.$type}' is registered twice.`,
			'unknown-binding': (e) => `${e.kind} binding '${e.$type}' names no registration.`,
			'missing-binding': (e) => `${e.kind} '${e.$type}' has no binding.`,
			'binding-overrides-contract': (e) =>
				`${e.kind} '${e.$type}' binding sets '${e.key}', which the contract defines.`,
			'schema-changes-type': (e) => `${e.kind} '${e.$type}' schema output must keep its $type '${e.$type}'.`,
			'schema-breaks-child-path': (e) =>
				`${e.kind} '${e.$type}' schema output does not keep the child path '${e.childPath?.join('.')}' as the document has it.`,
		};
		const failures: Record<RegistryErrorCode, () => unknown> = {
			'invalid-schema': () => createRegistry('Widget', [{ ...badge, schema: {} } as unknown as BaseRegistration]),
			'invalid-child-paths': () => createRegistry('Widget', [withPaths('blocks')]),
			'duplicate-child-path': () =>
				createRegistry('Widget', [withPaths([{ keys: ['a', 'b'] }, { keys: ['a', 'b'] }])]),
			'nested-child-path': () => createRegistry('Widget', [withPaths([{ keys: ['a'] }, { keys: ['a', 'b'] }])]),
			'duplicate-type': () => createRegistry('Widget', [badge, badge], { duplicates: 'error' }),
			'unknown-binding': () => bindUnchecked(contracts, { card: {}, badge: {}, crad: {} }),
			'missing-binding': () => bindUnchecked(contracts, { card: {} }),
			'binding-overrides-contract': () => bindUnchecked(contracts, { card: { metadata: {} }, badge: {} }),
			'schema-changes-type': () =>
				safeParseTree(
					parsing(() => ({})),
					{ $type: 'card' },
				),
			'schema-breaks-child-path': () =>
				safeParseTree(
					parsing((input) => ({ $type: input.$type })),
					{ $type: 'card', items: [{ $type: 'card' }] },
				),
		};

		it.each(Object.keys(failures) as RegistryErrorCode[])('%s', (code) => {
			const error = thrown(failures[code]);

			expect(error).toBeInstanceOf(RegistryError);
			expect((error as RegistryError).code).toBe(code);
			expect(templates[code](error as RegistryError)).toBe((error as RegistryError).message);
		});
	});

	describe('Scenario: assertStandardSchema on its own is not building a registry', () => {
		it('throws a plain Error with the context in the message', () => {
			const error = thrown(() => assertStandardSchema({}, "Registration 'x' schema"));

			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(RegistryError);
			expect(error).toMatchObject({
				message: "Registration 'x' schema must implement Standard Schema (~standard.validate).",
			});
		});
	});

	describe('Scenario: Parsing a document is not building', () => {
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
