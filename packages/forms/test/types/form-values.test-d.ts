import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { createFormRuntime } from '@/runtime/create-form-runtime';
import type { CreateFormRuntimeOptions, FormRuntimeConfig, FormValues } from '@/runtime/types';
import type { FormActionConfig } from '@/runtime/submission-lifecycle';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput, defineStatic } from '@/types';
import type { NormalizedFormConfig } from '@/lib/normalized-form-config';

const text = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

const count = defineInput({
	$type: 'count',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('count') }),
	metadata: { name: 'Count', category: 'input' },
	value: () => z.number(),
	render: () => null,
});

const choice = defineInput({
	$type: 'choice',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('choice'),
		multiple: z.optional(z.boolean()),
		options: z.array(z.object({ value: z.union([z.string(), z.number()]), label: z.string() })),
	}),
	metadata: { name: 'Choice', category: 'input' },
	value: ({ options, multiple }): z.ZodMiniType<string | number | Array<string | number>> => {
		const one = z.literal(options.map((option) => option.value));
		return multiple ? z.array(one) : one;
	},
	render: () => null,
});

const group = defineInput({
	childPaths: [{ keys: ['elements'], list: true }],
	$type: 'group',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('group'),
		elements: z.array(z.looseObject({ $type: z.string() })),
	}),
	metadata: { name: 'Group', category: 'input' },
	render: () => null,
});

const rows = defineInput({
	childPaths: [{ keys: ['elements'], list: true }],
	$type: 'rows',
	containerKind: 'array',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('rows'),
		initialValues: z.optional(z.record(z.string(), z.any())),
		elements: z.array(z.looseObject({ $type: z.string() })),
	}),
	metadata: { name: 'Rows', category: 'input' },
	render: () => null,
});

const note = defineStatic({
	$type: 'note',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('note') }),
	metadata: { name: 'Note', category: 'content' },
	render: () => null,
});

const picks = defineInput({
	$type: 'picks',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('picks') }),
	metadata: { name: 'Picks', category: 'input' },
	value: () => z.array(z.enum(['a', 'b'])),
	render: () => null,
});

const engine = createFormEngine({ elements: [text, count, choice, group, rows, note, picks] });

/** What `onSubmit` receives for a form, as the runtime types it: the parameter of the callback is what a test reads. */
declare function receives<TValues extends FormValues>(
	config: CreateFormRuntimeOptions<FormActionConfig, TValues>['config'],
	onSubmit: (values: TValues) => void,
): void;

/** A literal config types its values from the declarations. */
const flat = engine.defineForm({
	id: 'flat',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'text', name: 'email', rules: [{ $type: 'required' }] },
				{ $type: 'text', name: 'nickname' },
				{ $type: 'count', name: 'age', rules: [{ $type: 'required' }], disabled: true },
				{ $type: 'choice', name: 'size', options: [{ value: 1, label: 'S' }] },
				{ $type: 'note', name: 'aside' },
			],
		},
	],
});
receives(flat, (values) => {
	expectTypeOf(values).toEqualTypeOf<{
		readonly email: string;
		readonly nickname?: string | null;
		readonly age?: number;
		readonly size?: string | number | Array<string | number> | null;
	}>();
});

/** Dotted names nest, containers are objects, rows are lists, a skipped step is optional and the payload is added. */
const nested = engine.defineForm({
	id: 'nested',
	payload: { orderId: 7 },
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'text', name: 'address.street', rules: [{ $type: 'required' }] },
				{
					$type: 'group',
					name: 'profile',
					elements: [
						{ $type: 'text', name: 'first', rules: [{ $type: 'required' }] },
						{ $type: 'count', name: 'age' },
					],
				},
				{
					$type: 'rows',
					name: 'tags',
					elements: [{ $type: 'text', name: 'tag', rules: [{ $type: 'required' }] }],
				},
				{
					$type: 'rows',
					name: 'contacts',
					elements: [
						{ $type: 'text', name: 'name', rules: [{ $type: 'required' }] },
						{ $type: 'text', name: 'email' },
					],
				},
			],
		},
		{
			id: 'later',
			title: 'Later',
			constraints: [{ field: 'address.street', operator: 'is_not_empty', value: '', $type: 'show' }],
			elements: [{ $type: 'text', name: 'vat', rules: [{ $type: 'required' }] }],
		},
	],
});
receives(nested, (values) => {
	expectTypeOf(values).toEqualTypeOf<{
		readonly orderId: 7;
		readonly address: { readonly street: string };
		readonly profile: { readonly first: string; readonly age?: number | '' | null };
		readonly tags?: Array<string>;
		readonly contacts?: Array<{ readonly name: string; readonly email?: string | null }>;
		readonly vat?: string;
	}>();
});

/** A leaf whose declared value is a list, such as a checkbox group, is not a list of rows. */
const picked = engine.defineForm({
	id: 'picked',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'picks', name: 'picks' }] }],
});

/** The rows of a list of an optional scalar field have its empty value, as the values type says. */
const optionalRows = engine.defineForm({
	id: 'optional-rows',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [{ $type: 'rows', name: 'tags', elements: [{ $type: 'text', name: 'tag' }] }],
		},
	],
});

/** Only a leaf has an empty value: a list or a group is an empty list or object, so `null` is no default for one. */
declare function startsFrom<TValues extends FormValues>(
	config: CreateFormRuntimeOptions<FormActionConfig, TValues>['config'],
	defaults: CreateFormRuntimeOptions<FormActionConfig, TValues>['defaults'],
): void;
startsFrom(nested, { tags: ['a'], profile: { first: 'Ada' }, contacts: [{ name: 'Ada' }] });
startsFrom(nested, { tags: [] });
// @ts-expect-error -- a list's empty value is its empty list, not null
startsFrom(nested, { tags: null });
// @ts-expect-error -- a group's empty value is its empty object, not null
startsFrom(nested, { profile: null });
// @ts-expect-error -- a group's empty value is its empty object, not an empty string
startsFrom(nested, { profile: '' });
startsFrom(flat, { nickname: '', size: null });
// @ts-expect-error -- the rows of an array-valued leaf have no empty value: its declared schema rejects them
startsFrom(flat, { size: [1, null] });
startsFrom(flat, { size: [1] });
// @ts-expect-error -- the rows of an array-valued leaf have no empty value: its declared schema rejects them
startsFrom(picked, { picks: ['a', null] });
// @ts-expect-error -- the rows of an array-valued leaf are the values it declares, and '' is not one
startsFrom(picked, { picks: [''] });
startsFrom(picked, { picks: ['a'] });
startsFrom(picked, { picks: null });
startsFrom(optionalRows, { tags: ['', null, 'a'] });
receives(nested, (values) => {
	expectTypeOf(values.tags).toEqualTypeOf<Array<string> | undefined>();
	expectTypeOf(values.profile.age).toEqualTypeOf<number | '' | null | undefined>();
});

/** A one-child array whose child is a group has object rows built from the array's children, as the config says. */
const groupRows = engine.defineForm({
	id: 'group-rows',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'rows',
					name: 'stops',
					elements: [
						{
							$type: 'group',
							name: 'place',
							elements: [{ $type: 'text', name: 'city', rules: [{ $type: 'required' }] }],
						},
					],
				},
			],
		},
	],
});
receives(groupRows, (values) => {
	expectTypeOf(values).toEqualTypeOf<{
		readonly stops?: Array<{ readonly place: { readonly city: string } }>;
	}>();
});

/** A config that is not a literal gives FormValues. */
const elements: Array<{ $type: 'text'; name: string }> = [{ $type: 'text', name: 'email' }];
const dynamic = engine.defineForm({ id: 'dynamic', steps: [{ id: 'main', title: 'Main', elements }] });
receives(dynamic, (values) => {
	expectTypeOf(values).toEqualTypeOf<FormValues>();
});
const plain = engine.validateForm({});
receives(plain, (values) => {
	expectTypeOf(values).toEqualTypeOf<FormValues>();
});

/** validateForm with a values schema types the form as its output. */
const Profile = z.object({ email: z.string(), age: z.number() });
const bound = engine.validateForm({}, { values: Profile });
receives(bound, (values) => {
	expectTypeOf(values).toEqualTypeOf<{ email: string; age: number }>();
});

/** The values type is a claim only a normalized form can make: naming one for plain input, or for a runtime config that is not branded, is an error. */
// @ts-expect-error -- plain JSON is not a form of Profile
engine.validateForm<{ email: string }>({});
declare const unbranded: FormRuntimeConfig;
createFormRuntime<FormActionConfig, { email: string }>({
	engine,
	// @ts-expect-error -- a config that does not carry a values type cannot be given one
	config: unbranded,
	host: { focus: () => {} },
});

/** A value declaration is required exactly when the schema has no `elements`. */
// @ts-expect-error -- an input must declare the value its control writes
defineInput({
	$type: 'bare',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('bare') }),
	metadata: { name: 'Bare', category: 'input' },
	render: () => null,
});
defineInput({
	$type: 'box',
	// @ts-expect-error -- a container's value is composed from its children
	value: () => z.string(),
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('box'),
		elements: z.array(z.looseObject({ $type: z.string() })),
	}),
	metadata: { name: 'Box', category: 'input' },
	render: () => null,
});
defineInput({
	$type: 'bad-kind',
	// @ts-expect-error -- a containerKind belongs beside the elements it composes
	containerKind: 'object',
	value: () => z.string(),
	schema: z.extend(BaseFieldSchema, { $type: z.literal('bad-kind') }),
	metadata: { name: 'Bad kind', category: 'input' },
	render: () => null,
});

/** A plain validateForm result is FormValues, so it is not a form of a narrower values type. */
declare function profileForm(
	config: NormalizedFormConfig<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>,
		{ email: string }
	>,
): void;
profileForm(flat);
// @ts-expect-error -- a form validated without a schema holds FormValues, not { email: string }
profileForm(engine.validateForm({}));

/** What can leave a key out: an element's own constraints or disabled, a parent's, a step's, and a wide list or boolean. */
declare const wide: {
	constraints: Array<{ field: string; operator: 'equals'; value: unknown; $type: 'show' }>;
	disabled: boolean;
};
const conditional = engine.defineForm({
	id: 'conditional',
	steps: [
		{
			id: 'one',
			title: 'One',
			elements: [
				{
					$type: 'text',
					name: 'own',
					rules: [{ $type: 'required' }],
					constraints: [{ field: 'x', operator: 'equals', value: 1, $type: 'show' }],
				},
				{ $type: 'text', name: 'off', rules: [{ $type: 'required' }], disabled: wide.disabled },
				{ $type: 'text', name: 'wideList', rules: [{ $type: 'required' }], constraints: wide.constraints },
				{
					$type: 'group',
					name: 'parent',
					disabled: true,
					elements: [{ $type: 'text', name: 'inner', rules: [{ $type: 'required' }] }],
				},
				{ $type: 'text', name: 'plain', rules: [{ $type: 'required' }], constraints: [] },
			],
		},
		{
			id: 'two',
			title: 'Two',
			constraints: wide.constraints,
			elements: [{ $type: 'text', name: 'stepped', rules: [{ $type: 'required' }] }],
		},
	],
});
receives(conditional, (values) => {
	expectTypeOf(values).toEqualTypeOf<{
		readonly own?: string;
		readonly off?: string;
		readonly wideList?: string;
		readonly parent?: { readonly inner?: string };
		readonly plain: string;
		readonly stepped?: string;
	}>();
});
