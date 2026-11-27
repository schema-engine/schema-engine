import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import {
	bindRegistry,
	createRegistry,
	safeParseNode,
	type BaseRegistration,
	type ReadOnlyRegistry,
	type RegistryBindings,
} from '../../src';

const cardContract = {
	$type: 'card',
	schema: z.object({ $type: z.literal('card'), title: z.string() }),
	metadata: { name: 'Card' },
} as const;
const badgeContract = {
	$type: 'badge',
	schema: z.object({ $type: z.literal('badge'), label: z.string() }),
	metadata: { name: 'Badge' },
} as const;
const contracts = createRegistry('Widget', [cardContract, badgeContract]);

interface ReactBinding {
	render: (props: never) => string;
}
interface RadiantBinding {
	tag: string;
}

const renderCard = (props: { title: string }) => props.title;
const renderBadge = (props: { label: string }) => props.label;

const react = bindRegistry(contracts, {
	card: { render: renderCard },
	badge: { render: renderBadge },
} satisfies RegistryBindings<typeof contracts, ReactBinding>);
const radiant = bindRegistry(contracts, { card: { tag: 'se-card' }, badge: { tag: 'se-badge' } });

expectTypeOf(react.get('card').render).toEqualTypeOf<typeof renderCard>();
expectTypeOf(react.get('badge').render).toEqualTypeOf<typeof renderBadge>();
expectTypeOf(radiant.get('card').tag).toEqualTypeOf<'se-card'>();
expectTypeOf(react.get('card').$type).toEqualTypeOf<'card'>();
expectTypeOf(react.get('card').schema).toEqualTypeOf<typeof cardContract.schema>();
expectTypeOf(react).toExtend<ReadOnlyRegistry>();

const fromDocument: string = 'card';
expectTypeOf(react.get(fromDocument)).toBeNullable();

bindRegistry(
	contracts,
	// @ts-expect-error the `badge` binding is missing
	{ card: { render: renderCard } },
);

bindRegistry(contracts, {
	card: { render: renderCard },
	badge: { render: renderBadge },
	// @ts-expect-error `crad` names no registration
	crad: { render: renderCard },
});

bindRegistry(contracts, {
	// @ts-expect-error a binding may not set the contract's schema
	card: { render: renderCard, schema: z.string() },
	badge: { render: renderBadge },
});

bindRegistry(contracts, {
	card: { render: renderCard },
	// @ts-expect-error a binding may not set the contract's metadata
	badge: { render: renderBadge, metadata: { name: 'Other' } },
});

// @ts-expect-error a binding that does not satisfy the shared binding shape
void ({ card: { tag: 1 }, badge: { tag: 'x' } } satisfies RegistryBindings<typeof contracts, RadiantBinding>);

const untyped = createRegistry<BaseRegistration>('Widget', []);
const untypedBound = bindRegistry(untyped, { anything: { render: renderCard } });
expectTypeOf(untypedBound.get('anything')).toBeNullable();

const parsed = safeParseNode(react, {});
if (parsed.success && parsed.$type === 'card') {
	expectTypeOf(parsed.registration.render).toEqualTypeOf<typeof renderCard>();
	expectTypeOf(parsed.data).toEqualTypeOf<{ $type: 'card'; title: string }>();
}
