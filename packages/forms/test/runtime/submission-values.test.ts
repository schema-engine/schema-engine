import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { logger } from '@/lib/logger';
import { getNormalizedFormValues } from '@/lib/normalized-form-config';
import { createFormRuntime } from '@/runtime';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';

const stars = defineInput({
	$type: 'stars',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('stars'), max: z._default(z.number(), 5) }),
	metadata: { name: 'Stars', category: 'input' },
	value: ({ max }) => z.number().check(z.int(), z.gte(1), z.lte(max)),
	render: () => null,
});

const probe = {
	$type: 'probe',
	schema: z.looseObject({ $type: z.literal('probe'), id: z.string() }),
	metadata: { name: 'Probe' },
	execute: async () => ({ success: true }),
};

const engine = createFormEngine({ elements: [stars], actions: [probe] });
const elements = [
	{ $type: 'stars', name: 'rating', max: 3 },
	{ $type: 'stars', name: 'service', max: 3 },
];

function setup(options: { values?: z.ZodMiniType; defaults?: Record<string, unknown> } = {}) {
	const form = {
		id: 'review',
		steps: [{ id: 'main', title: 'Main', elements }],
		actions: [{ $type: 'probe', id: 'probe', triggers: ['form_submit'] }],
	};
	const config = options.values ? engine.validateForm(form, { values: options.values }) : engine.validateForm(form);
	const onSubmit = vi.fn();
	const onAction = vi.fn();
	const runtime = createFormRuntime({
		engine,
		config,
		defaults: options.defaults,
		host: { focus: vi.fn() },
		onSubmit,
		onAction,
	});
	runtime.mount();
	return { runtime, onSubmit, onAction };
}

afterEach(() => vi.restoreAllMocks());

describe('the check of submitted values', () => {
	test('a value a control wrote that its declaration rejects fails the submission at its path, and onSubmit never runs', async () => {
		const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const { runtime, onSubmit } = setup();
		runtime.container.setValue('rating', 2);
		runtime.container.setValue('service', '3');

		expect(await runtime.submit()).toBe('failed');

		expect(onSubmit).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().submission).toMatchObject({
			status: 'error',
			failures: [{ type: 'valueMismatch', source: 'submission', params: { path: 'service' } }],
		});
		expect(error).toHaveBeenCalledWith(expect.stringContaining('do not match'), expect.anything());
	});

	test('every mismatched path is a failure, and a bound beyond the configured max is one', async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const { runtime } = setup();
		runtime.container.setValue('rating', 4);
		runtime.container.setValue('service', 0);

		await runtime.submit();

		expect(runtime.getSnapshot().submission.failures.map((failure) => failure.params)).toEqual([
			{ path: 'rating' },
			{ path: 'service' },
		]);
	});

	test('matching values reach onSubmit as the parsed values, frozen', async () => {
		const { runtime, onSubmit, onAction } = setup();
		runtime.container.setValue('rating', 2);
		runtime.container.setValue('service', 3);

		expect(await runtime.submit()).toBe('submitted');

		expect(onSubmit).toHaveBeenCalledWith({ rating: 2, service: 3 }, expect.anything());
		expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'probe' }), { rating: 2, service: 3 });
		expect(Object.isFrozen(onSubmit.mock.calls[0]?.[0])).toBe(true);
	});

	test('the application schema parses after the derived one, and onSubmit gets its output', async () => {
		const Review = z.pipe(
			z.object({ rating: z.number(), service: z.number() }),
			z.transform(({ rating, service }) => ({ average: (rating + service) / 2 })),
		);
		const { runtime, onSubmit, onAction } = setup({ values: Review });
		runtime.container.setValue('rating', 1);
		runtime.container.setValue('service', 3);

		expect(await runtime.submit()).toBe('submitted');

		expect(onSubmit).toHaveBeenCalledWith({ average: 2 }, expect.anything());
		expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'probe' }), { average: 2 });
	});

	test('a value the application schema rejects fails the submission too', async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const { runtime, onSubmit } = setup({ values: z.object({ rating: z.literal(3), service: z.number() }) });
		runtime.container.setValue('rating', 1);
		runtime.container.setValue('service', 3);

		expect(await runtime.submit()).toBe('failed');

		expect(onSubmit).not.toHaveBeenCalled();
		expect(runtime.getSnapshot().submission.failures).toMatchObject([
			{ type: 'valueMismatch', params: { path: 'rating' } },
		]);
	});

	test('the check runs before the submit actions', async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const { runtime, onAction } = setup();
		runtime.container.setValue('rating', 9);
		runtime.container.setValue('service', 1);

		await runtime.submit();

		expect(onAction).not.toHaveBeenCalled();
	});

	test('a default that does not match its field is dropped, and a warning names its path, so the form still renders', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);

		const { runtime } = setup({ defaults: { rating: 'five', service: 2, stray: true } });

		expect(runtime.container.getValue('rating')).toBeUndefined();
		expect(runtime.container.getValue('service')).toBe(2);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toMatch(/defaultValues do not match.*'rating'/);
		expect(warn.mock.calls[0]?.[0]).not.toMatch(/'service'/);
	});

	test('a dropped default leaves the field to its own rules, which ask for it', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		const own = createFormEngine({ elements: [stars] });
		const runtime = createFormRuntime({
			engine: own,
			config: own.validateForm({
				id: 'review',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'stars', name: 'rating', rules: [{ type: 'required' }] }],
					},
				],
			}),
			defaults: { rating: 'five' },
			host: { focus: vi.fn() },
		});
		runtime.mount();

		expect(await runtime.submit()).toBe('invalid');
		expect(runtime.container.getSnapshot().errors).toHaveProperty('rating');
	});

	test('defaultValues may be partial, empty or name no field, and none is dropped', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);

		setup({ defaults: { rating: 2, service: '', stray: true } });

		expect(warn).not.toHaveBeenCalled();
	});

	test('a failure carries the path and no library text, so the form words it', async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const { runtime } = setup();
		runtime.container.setValue('rating', 'x');
		runtime.container.setValue('service', 1);

		await runtime.submit();

		expect(runtime.getSnapshot().submission.failures).toEqual([
			{ type: 'valueMismatch', source: 'submission', params: { path: 'rating' } },
		]);
	});

	test('binding a normalized form to a schema copies it, and leaves the form it was given as it was', () => {
		const Review = z.object({ rating: z.number(), service: z.number() });
		const plain = engine.validateForm({ id: 'r', steps: [{ id: 'main', title: 'Main', elements }] });

		const bound = engine.validateForm(plain, { values: Review });

		expect(getNormalizedFormValues(bound)).toBe(Review);
		expect(getNormalizedFormValues(plain)).toBeUndefined();
		expect(engine.validateForm(bound, { values: Review })).toBe(bound);
		expect(engine.validateForm(plain)).toBe(plain);
	});

	test('a one-child array with object-row defaults but no initialValues is a list of values, so its defaults are dropped', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		const rows = defineInput({
			$type: 'rows',
			containerKind: 'array',
			schema: z.extend(BaseFieldSchema, {
				$type: z.literal('rows'),
				initialValues: z.optional(z.record(z.string(), z.any())),
				elements: z.optional(z.array(z.looseObject({ $type: z.string() }))),
			}),
			metadata: { name: 'Rows', category: 'input' },
			render: () => null,
		});
		const own = createFormEngine({ elements: [stars, rows] });
		const build = (
			extra: Record<string, unknown>,
			defaults: Record<string, unknown> = { members: [{ role: 2 }] },
		) =>
			createFormRuntime({
				engine: own,
				config: own.validateForm({
					id: 'members',
					steps: [
						{
							id: 'main',
							title: 'Main',
							elements: [
								{
									$type: 'rows',
									name: 'members',
									...extra,
									elements: [{ $type: 'stars', name: 'role', max: 3 }],
								},
							],
						},
					],
				}),
				defaults,
				host: { focus: vi.fn() },
			});

		const dropped = build({});
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toMatch(/defaultValues do not match.*'members':/);
		expect(dropped.container.getValue('members')).toEqual(build({}, {}).container.getValue('members'));

		warn.mockClear();
		const kept = build({ initialValues: { role: 1 } });
		expect(warn).not.toHaveBeenCalled();
		expect(kept.container.getValue('members')).toEqual([{ role: 2 }]);
	});

	test('one bad row of a list drops the default of the whole list, which a warning names', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
		const rows = defineInput({
			$type: 'rows',
			containerKind: 'array',
			schema: z.extend(BaseFieldSchema, {
				$type: z.literal('rows'),
				elements: z.optional(z.array(z.looseObject({ $type: z.string() }))),
			}),
			metadata: { name: 'Rows', category: 'input' },
			render: () => null,
		});
		const own = createFormEngine({ elements: [stars, rows] });
		const build = (defaults: Record<string, unknown>) =>
			createFormRuntime({
				engine: own,
				config: own.validateForm({
					id: 'ranks',
					steps: [
						{
							id: 'main',
							title: 'Main',
							elements: [
								{ $type: 'rows', name: 'ranks', elements: [{ $type: 'stars', name: 'rank', max: 3 }] },
							],
						},
					],
				}),
				defaults,
				host: { focus: vi.fn() },
			});

		const dropped = build({ ranks: [1, 'x', 3] });

		expect(dropped.container.getValue('ranks')).toEqual(build({}).container.getValue('ranks'));
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toMatch(/'ranks':/);
		expect(warn.mock.calls[0]?.[0]).not.toMatch(/'ranks\.\d/);
		warn.mockClear();

		expect(build({ ranks: [1, 2, 3] }).container.getValue('ranks')).toEqual([1, 2, 3]);
		expect(warn).not.toHaveBeenCalled();
	});

	test('a default a value schema cannot check synchronously is dropped with an error, and the form still renders', () => {
		const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const later = defineInput({
			$type: 'later',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('later') }),
			metadata: { name: 'Later', category: 'input' },
			value: () => ({
				'~standard': { version: 1 as const, vendor: 'test', validate: async (value: unknown) => ({ value }) },
			}),
			render: () => null,
		});
		const own = createFormEngine({ elements: [stars, later] });
		const runtime = createFormRuntime({
			engine: own,
			config: own.validateForm({
				id: 'slow',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [
							{ $type: 'later', name: 'slow' },
							{ $type: 'stars', name: 'rating', max: 3 },
						],
					},
				],
			}),
			defaults: { slow: 'x', rating: 2 },
			host: { focus: vi.fn() },
		});

		expect(runtime.container.getValue('slow')).toBeUndefined();
		expect(runtime.container.getValue('rating')).toBe(2);
		expect(error).toHaveBeenCalledOnce();
		expect(error.mock.calls[0]?.[0]).toMatch(/could not be checked.*'slow'/);
	});

	test('a native post gets the values the form declares, not what the application schema made of them', async () => {
		const note = defineInput({
			$type: 'note',
			schema: z.extend(BaseFieldSchema, { $type: z.literal('note') }),
			metadata: { name: 'Note', category: 'input' },
			value: () => z.string(),
			render: () => null,
		});
		const own = createFormEngine({ elements: [note] });
		const Order = z.object({ when: z.coerce.date() });
		const config = own.validateForm(
			{ id: 'order', steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'note', name: 'when' }] }] },
			{ values: Order },
		);
		const submitNatively = vi.fn();
		const onSubmit = vi.fn();
		const runtime = createFormRuntime({ engine: own, config, host: { focus: vi.fn(), submitNatively }, onSubmit });
		runtime.mount();
		runtime.container.setValue('when', '2026-11-23');

		expect(await runtime.submit()).toBe('submitted');

		expect(onSubmit).toHaveBeenCalledWith({ when: new Date('2026-11-23') }, expect.anything());
		expect(submitNatively).toHaveBeenCalledWith({ when: '2026-11-23' });
	});
});
