import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { bindRegistry, createRegistry, type BaseRegistration, type ReadOnlyRegistry } from '../src';

const card = {
	$type: 'card',
	schema: z.object({ title: z.string() }),
	metadata: { name: 'Card' },
} as const;

const badge = {
	$type: 'badge',
	schema: z.object({ label: z.string() }),
	metadata: { name: 'Badge' },
} as const;

const contracts = createRegistry('Widget', [card, badge]);

const renderCard = (props: { title: string }) => `<h1>${props.title}</h1>`;
const renderBadge = (props: { label: string }) => `<b>${props.label}</b>`;

describe('bindRegistry', () => {
	describe('Scenario: Two renderers bind one contracts registry', () => {
		const react = bindRegistry(contracts, { card: { render: renderCard }, badge: { render: renderBadge } });
		const radiant = bindRegistry(contracts, { card: { tag: 'se-card' }, badge: { tag: 'se-badge' } });

		it('merges each binding into the registration its $type names', () => {
			expect(react.get('card').render).toBe(renderCard);
			expect(react.get('card').metadata.name).toBe('Card');
			expect(radiant.get('badge').tag).toBe('se-badge');
		});

		it('shares the schema object by identity, not by copy', () => {
			const contractCard = contracts.get('card');

			expect(react.get('card').schema).toBe(contractCard?.schema);
			expect(radiant.get('card').schema).toBe(contractCard?.schema);
			expect(react.get('badge').metadata).toBe(contracts.get('badge')?.metadata);
		});

		it('keeps the contracts order and freezes the result', () => {
			expect(react.keys()).toEqual(contracts.keys());
			expect(react.all().map((registration) => registration.$type)).toEqual(['card', 'badge']);
			expect(react.kind).toBe('Widget');
			expect(Object.isFrozen(react)).toBe(true);
			expect(Object.isFrozen(react.all())).toBe(true);
			expect(Object.isFrozen(react.get('card'))).toBe(true);
		});

		it('leaves the contracts untouched', () => {
			expect(contracts.get('card')).not.toHaveProperty('render');
			expect(contracts.get('card')).not.toHaveProperty('tag');
		});
	});

	describe('Scenario: A binding that does not fit an untyped contracts registry fails the build', () => {
		const untyped = createRegistry<BaseRegistration>('Widget', [card, badge]);

		it('names the kind and the $type of a contract with no binding', () => {
			expect(() => bindRegistry(untyped, { card: { render: renderCard } })).toThrow(
				"Widget 'badge' has no binding.",
			);
		});

		it('names the key of a binding no contract answers', () => {
			expect(() =>
				bindRegistry(untyped, { card: { render: renderCard }, badge: { render: renderBadge }, crad: {} }),
			).toThrow("Widget binding 'crad' names no registration.");
		});

		it('names the key a binding sets that the contract defines', () => {
			const bindings: Record<string, Record<string, unknown>> = {
				card: { render: renderCard, schema: z.string() },
				badge: { render: renderBadge },
			};
			const bindUnchecked: (
				contracts: ReadOnlyRegistry,
				bindings: Readonly<Record<string, Record<string, unknown>>>,
			) => ReadOnlyRegistry = bindRegistry;

			expect(() => bindUnchecked(untyped, bindings)).toThrow(
				"Widget 'card' binding sets 'schema', which the contract defines.",
			);
		});

		it('does not take a binding from the Object prototype', () => {
			const prototypeContracts = createRegistry<BaseRegistration>('Widget', [{ ...card, $type: 'constructor' }]);

			expect(() => bindRegistry(prototypeContracts, {})).toThrow("Widget 'constructor' has no binding.");
		});

		it('builds when every contract has its binding', () => {
			const bound = bindRegistry(untyped, { card: { render: renderCard }, badge: { render: renderBadge } });

			expect(bound.size).toBe(2);
			expect(bound.get('card')).toMatchObject({ $type: 'card', render: renderCard });
			expect(bound.get('missing')).toBeUndefined();
		});
	});
});
