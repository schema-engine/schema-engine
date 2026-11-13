import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { builtInAxes, compileAppearance, defineAxis } from '@/lib/appearance';
import {
	AppearanceConfigSchema,
	createAppearanceSchema,
	withAppearanceAxes,
	withSlotAppearanceAxes,
} from '@/schemas/appearance';

const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: {} },
});
const { registry } = compileAppearance([...builtInAxes, tone]);

type JsonSchema = {
	properties?: Record<string, { enum?: string[]; properties?: Record<string, { enum?: string[] }> } & JsonSchema>;
	additionalProperties?: boolean;
};

const jsonOf = (schema: z.ZodMiniType) => z.toJSONSchema(schema, { io: 'input' }) as JsonSchema;
const appearanceKeys = (schema: z.ZodMiniType) => Object.keys(jsonOf(schema).properties?.appearance?.properties ?? {});

describe('createAppearanceSchema', () => {
	test('lists every axis of the theme when the owner accepts all of them', () => {
		expect(Object.keys(jsonOf(createAppearanceSchema(registry)).properties ?? {})).toEqual([
			'size',
			'surface',
			'tone',
		]);
	});

	test('lists only the axes an owner supports, closed', () => {
		const schema = jsonOf(createAppearanceSchema(registry, ['tone']));
		expect(schema.properties?.tone.enum).toEqual(['neutral', 'brand']);
		expect(Object.keys(schema.properties ?? {})).toEqual(['tone']);
		expect(schema.additionalProperties).toBe(false);
	});

	test('an owner that supports nothing gets a closed object with no axes', () => {
		const schema = jsonOf(createAppearanceSchema(registry, []));
		expect(schema.properties).toEqual({});
		expect(schema.additionalProperties).toBe(false);
	});
});

describe('withAppearanceAxes', () => {
	const open = z.object({ id: z.string(), appearance: z.optional(AppearanceConfigSchema) });

	test('closes an open appearance key over the declared axes', () => {
		expect(appearanceKeys(withAppearanceAxes(open, registry, ['size']))).toEqual(['size']);
	});

	test('an object that declares none closes its appearance key to nothing', () => {
		const schema = jsonOf(withAppearanceAxes(open, registry));
		expect(schema.properties?.appearance?.additionalProperties).toBe(false);
		expect(appearanceKeys(withAppearanceAxes(open, registry))).toEqual([]);
	});

	test('adds the key to an object that lacks it when it declares axes', () => {
		const strict = z.strictObject({ id: z.string() });
		expect(appearanceKeys(withAppearanceAxes(strict, registry, ['tone']))).toEqual(['tone']);
	});

	test('an object that has no key and declares none still gets a closed one', () => {
		const loose = z.object({ id: z.string() });
		const schema = jsonOf(withAppearanceAxes(loose, registry));
		expect(schema.properties?.appearance?.properties).toEqual({});
		expect(schema.properties?.appearance?.additionalProperties).toBe(false);
		expect(z.safeParse(withAppearanceAxes(loose, registry), { id: 'a', appearance: { bogus: 'x' } }).success).toBe(
			false,
		);
	});

	test('rewrites the input of a pipe and keeps its transform', () => {
		const piped = z.pipe(
			open,
			z.transform((value) => ({ ...value, seen: true })),
		);
		const closed = withAppearanceAxes(piped, registry, ['size']);
		expect(closed).not.toBe(piped);
		expect(appearanceKeys(closed)).toEqual(['size']);
		expect(z.safeParse(closed, { id: 'a', appearance: { size: 'compact' } }).data).toMatchObject({ seen: true });
	});

	test('leaves a schema that is not a plain object as it is', () => {
		const lazy = z.lazy(() => open);
		expect(withAppearanceAxes(lazy, registry, ['size'])).toBe(lazy);
	});

	test('keeps the refinements of the schema it closes', () => {
		const refined = open.check(z.refine((value) => value.id !== 'x', 'no x'));
		const closed = withAppearanceAxes(refined, registry, ['size']);
		expect(closed).not.toBe(refined);
		expect(z.safeParse(closed, { id: 'x' }).success).toBe(false);
		expect(z.safeParse(closed, { id: 'y', appearance: { size: 'compact' } }).success).toBe(true);
	});

	test('does not change the schema it was given', () => {
		withAppearanceAxes(open, registry, ['size']);
		expect(z.safeParse(open, { id: 'a', appearance: { anything: 'goes' } }).success).toBe(true);
	});
});

describe('withSlotAppearanceAxes', () => {
	const slot = (extra: Record<string, z.ZodMiniType> = {}) =>
		z.strictObject({ appearance: z.optional(AppearanceConfigSchema), ...extra });
	const view = z.strictObject({
		$type: z.literal('r'),
		shell: z.prefault(slot(), {}),
		header: z.prefault(z.strictObject({ size: z.optional(z.string()) }), {}),
		footer: z.prefault(slot(), {}),
	});

	test('closes each slot over the axes the recipe declares for it', () => {
		const schema = jsonOf(withSlotAppearanceAxes(view, registry, { shell: ['size', 'surface'] }));
		const slots = schema.properties as NonNullable<JsonSchema['properties']>;
		expect(Object.keys(slots.shell.properties?.appearance?.properties ?? {})).toEqual(['size', 'surface']);
		expect(slots.shell.properties?.appearance?.properties?.surface.enum).toEqual(['flat', 'outlined', 'elevated']);
	});

	test('a slot that declares nothing is closed to no axes', () => {
		const slots = jsonOf(withSlotAppearanceAxes(view, registry, { shell: ['size'] })).properties!;
		expect(slots.footer.properties?.appearance?.properties).toEqual({});
		expect(slots.footer.properties?.appearance?.additionalProperties).toBe(false);
	});

	test('a slot whose schema has no appearance key gets a closed one too', () => {
		const slots = jsonOf(withSlotAppearanceAxes(view, registry, { shell: ['size'] })).properties!;
		expect(slots.header.properties?.appearance?.properties).toEqual({});
		expect(slots.header.properties?.appearance?.additionalProperties).toBe(false);
	});

	test('a view that is not an object comes back unchanged', () => {
		const lazy = z.lazy(() => view);
		expect(withSlotAppearanceAxes(lazy, registry)).toBe(lazy);
	});

	test('the slot defaults still apply when the view parses', () => {
		const schema = withSlotAppearanceAxes(view, registry, { shell: ['size'] });
		expect(z.safeParse(schema, { $type: 'r' }).success).toBe(true);
	});
});
