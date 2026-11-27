import type { StandardSchemaV1 } from '@standard-schema/spec';
import { expectTypeOf } from 'vitest';
import * as v from 'valibot';
import * as z from 'zod/mini';
import { readSlotConfig } from '@/recipes/view-model';
import { bindRecipe } from '@/recipes/bind-recipe';
import { createRecipeRegistry, defineRecipeProtocol, type KindOf, type SlotOf } from '@/recipes/protocol';
import { defineProtocolRecipeSpec } from '@/recipes/define-recipe-spec';
import { ContentConfigSchema, MediaConfigSchema, sectionProtocol } from './section-protocol';

expectTypeOf<SlotOf<typeof sectionProtocol>>().toEqualTypeOf<'shell' | 'media' | 'content'>();
expectTypeOf<KindOf<typeof sectionProtocol>>().toEqualTypeOf<'section'>();

const hero = defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'hero',
	kind: 'section',
	metadata: { name: 'Hero' },
	slotSchemas: { media: MediaConfigSchema, content: ContentConfigSchema },
	slotDefaults: { content: { columns: 2 } },
	appearanceAxes: { media: ['size'] },
});

expectTypeOf(hero.$type).toEqualTypeOf<'hero'>();
expectTypeOf(hero.kind).toEqualTypeOf<'section'>();
expectTypeOf(hero.slotSchemas).toHaveProperty('media');
expectTypeOf(hero.slotSchemas).toHaveProperty('content');

expectTypeOf<StandardSchemaV1.InferInput<typeof hero.schema>>().toEqualTypeOf<{
	$type: 'hero';
	media?: z.input<typeof MediaConfigSchema>;
	content?: z.input<typeof ContentConfigSchema>;
}>();
expectTypeOf<StandardSchemaV1.InferOutput<typeof hero.schema>>().toEqualTypeOf<{
	$type: 'hero';
	media: z.output<typeof MediaConfigSchema>;
	content: z.output<typeof ContentConfigSchema>;
}>();

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'outside-slot',
	kind: 'section',
	metadata: { name: 'Outside' },
	slotSchemas: {
		content: ContentConfigSchema,
		// @ts-expect-error a slot outside the protocol is a type error
		aside: ContentConfigSchema,
	},
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'wrong-kind',
	// @ts-expect-error a kind outside the protocol is a type error
	kind: 'wizard',
	metadata: { name: 'Wrong' },
	slotSchemas: { content: ContentConfigSchema },
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'undeclared-default',
	kind: 'section',
	metadata: { name: 'Default' },
	slotSchemas: { content: ContentConfigSchema },
	// @ts-expect-error a slot default must name a declared slot
	slotDefaults: { media: {} },
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'undeclared-axis',
	kind: 'section',
	metadata: { name: 'Axis' },
	slotSchemas: { content: ContentConfigSchema },
	// @ts-expect-error an appearance axis must name a declared slot
	appearanceAxes: { media: ['size'] },
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'bad-default-value',
	kind: 'section',
	metadata: { name: 'Value' },
	slotSchemas: { content: ContentConfigSchema },
	// @ts-expect-error a slot default is typed by the slot schema input
	slotDefaults: { content: { columns: 'two' } },
});

const registration = bindRecipe(hero, { shell: null });
expectTypeOf(registration.kind).toEqualTypeOf<'section'>();
expectTypeOf(registration.slots).toEqualTypeOf<Array<'shell' | 'media' | 'content'>>();
expectTypeOf(registration.render).toEqualTypeOf<{ shell: null }>();

const other = defineRecipeProtocol({ slots: ['body'], kinds: ['page', 'post'] });
expectTypeOf<SlotOf<typeof other>>().toEqualTypeOf<'body'>();
expectTypeOf<KindOf<typeof other>>().toEqualTypeOf<'page' | 'post'>();

createRecipeRegistry(sectionProtocol, [registration]);

// @ts-expect-error a registration with a kind outside the protocol is a type error
createRecipeRegistry(sectionProtocol, [{ ...registration, kind: 'wizard' as const }]);

// @ts-expect-error a registration declaring a slot outside the protocol is a type error
createRecipeRegistry(sectionProtocol, [{ ...registration, slots: ['aside' as const] }]);

defineRecipeProtocol({
	slots: ['body'],
	kinds: ['page'],
	// @ts-expect-error a rule can only read the kinds the protocol declares
	rules: [{ name: 'reads-unknown-kind', check: (recipe) => (recipe.kind === 'post' ? 'no posts' : undefined) }],
});

const ShellValibot = v.strictObject({
	accent: v.optional(v.string(), '#000'),
	gap: v.optional(v.picklist(['sm', 'md']), 'sm'),
	appearance: v.optional(v.record(v.string(), v.string())),
});

const valibotSpec = defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'valibot-hero',
	kind: 'section',
	metadata: { name: 'Valibot hero' },
	slotSchemas: { shell: ShellValibot, content: ContentConfigSchema },
	slotDefaults: { shell: { gap: 'md' } },
	appearanceAxes: { shell: ['size'] },
});

expectTypeOf<StandardSchemaV1.InferInput<typeof valibotSpec.schema>>().toEqualTypeOf<{
	$type: 'valibot-hero';
	shell?: v.InferInput<typeof ShellValibot>;
	content?: z.input<typeof ContentConfigSchema>;
}>();
expectTypeOf<StandardSchemaV1.InferOutput<typeof valibotSpec.schema>>().toEqualTypeOf<{
	$type: 'valibot-hero';
	shell: v.InferOutput<typeof ShellValibot>;
	content: z.output<typeof ContentConfigSchema>;
}>();
expectTypeOf(readSlotConfig({}, 'shell', ShellValibot)).toEqualTypeOf<v.InferOutput<typeof ShellValibot>>();

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'bad-valibot-default',
	kind: 'section',
	metadata: { name: 'Value' },
	slotSchemas: { shell: ShellValibot, content: ContentConfigSchema },
	// @ts-expect-error a slot default is typed by the Valibot slot schema input
	slotDefaults: { shell: { gap: 'xl' } },
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'strict-zod-axes',
	kind: 'section',
	metadata: { name: 'Axes' },
	slotSchemas: { content: z.strictObject({ columns: z.optional(z.number()) }) },
	// @ts-expect-error a strict Zod slot without an appearance key cannot declare axes
	appearanceAxes: { content: ['size'] },
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'strict-valibot-axes',
	kind: 'section',
	metadata: { name: 'Axes' },
	slotSchemas: { content: v.strictObject({ columns: v.optional(v.number()) }) },
	// @ts-expect-error a strict Valibot slot without an appearance key cannot declare axes
	appearanceAxes: { content: ['size'] },
});

defineProtocolRecipeSpec(sectionProtocol, {
	$type: 'loose-zod-axes',
	kind: 'section',
	metadata: { name: 'Axes' },
	slotSchemas: { content: z.looseObject({ columns: z.optional(z.number()) }) },
	appearanceAxes: { content: ['size'] },
});
