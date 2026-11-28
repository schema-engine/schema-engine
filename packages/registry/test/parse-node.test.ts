import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import {
	createMutableRegistry,
	createRegistry,
	safeParseNode,
	unregisteredTypeMessage,
	type BaseRegistration,
} from '../src';

const badge: BaseRegistration = {
	$type: 'badge',
	schema: z.object({ $type: z.literal('badge'), label: z.string(), tone: z._default(z.string(), 'info') }),
	metadata: { name: 'Badge' },
};

const badges = createRegistry('Badge', [badge]);

describe('safeParseNode', () => {
	it('returns the registration and what its schema returned, defaults applied', () => {
		const result = safeParseNode(badges, { $type: 'badge', label: 'Paid' });

		expect(result.success && result.registration).toBe(badges.get('badge'));
		expect(result).toMatchObject({ success: true, data: { $type: 'badge', label: 'Paid', tone: 'info' } });
	});

	it('repeats the $type of the registration at the top of a success, which narrows its data', () => {
		const result = safeParseNode(badges, { $type: 'badge', label: 'Paid' });

		expect(result.success && result.$type).toBe('badge');
	});

	it('puts the path of the node in front of the path of each schema issue', () => {
		const node: unknown = JSON.parse('{ "$type": "badge", "label": 5, "tone": 1 }');
		const result = safeParseNode(badges, node, { path: ['children', 2] });

		expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([
			['children', 2, 'label'],
			['children', 2, 'tone'],
		]);
	});

	it('leaves the path of an issue as the schema reported it when the node has no path', () => {
		const node: unknown = JSON.parse('{ "$type": "badge", "label": 5 }');
		const result = safeParseNode(badges, node);

		expect(!result.success && result.issues.map((issue) => issue.path)).toEqual([['label']]);
	});

	it('reports a $type no registration answers at its $type', () => {
		expect(safeParseNode(badges, { $type: 'chip' }, { path: [1] })).toEqual({
			success: false,
			issues: [
				{
					code: 'registry/unregistered-type',
					message: "No registration for $type 'chip'.",
					path: [1, '$type'],
					received: 'chip',
				},
			],
		});
	});

	it('adds the hint of the lookup to the message of a $type no registration answers', () => {
		const lookup = { get: (type: string) => badges.get(type), hint: 'Register it with defineBadge.' };

		expect(safeParseNode(lookup, { $type: 'chip' }, { path: [1] })).toEqual({
			success: false,
			issues: [
				{
					code: 'registry/unregistered-type',
					message: "No registration for $type 'chip'. Register it with defineBadge.",
					path: [1, '$type'],
					received: 'chip',
				},
			],
		});
	});

	it('does not add the hint to an issue that is not about an unregistered $type', () => {
		const lookup = { get: (type: string) => badges.get(type), hint: 'Register it with defineBadge.' };

		const results = [safeParseNode(lookup, null), safeParseNode(lookup, { $type: 7 })];

		for (const result of results) {
			expect(!result.success && result.issues.map((issue) => issue.message)).not.toContainEqual(
				expect.stringContaining('defineBadge'),
			);
		}
	});

	it('words an unregistered $type the same way for a caller that throws', () => {
		expect(unregisteredTypeMessage('chip')).toBe("No registration for $type 'chip'.");
		expect(unregisteredTypeMessage('chip', 'Register it with defineBadge.')).toBe(
			"No registration for $type 'chip'. Register it with defineBadge.",
		);
	});

	it.each([null, undefined, 'badge', 7, []])(
		'reports %j, which is not an object, at the path of the node',
		(node) => {
			expect(safeParseNode(badges, node, { path: [3] })).toEqual({
				success: false,
				issues: [
					{ code: 'registry/not-an-object', message: 'Expected an object with a string $type.', path: [3] },
				],
			});
		},
	);

	it.each([{}, { $type: 7 }])('reports %j, an object without a string $type, at its $type', (node) => {
		expect(safeParseNode(badges, node, { path: [3] })).toEqual({
			success: false,
			issues: [{ code: 'registry/missing-type', message: 'Expected a string $type.', path: [3, '$type'] }],
		});
	});

	describe('accepts', () => {
		it('lets a $type of the list through to the schema', () => {
			expect(
				safeParseNode(badges, { $type: 'badge', label: 'Paid' }, { accepts: ['badge', 'chip'] }).success,
			).toBe(true);
		});

		it('gives a $type outside the list the issue registry/not-accepted at its $type, with expected and received', () => {
			const result = safeParseNode(
				badges,
				{ $type: 'badge', label: 'Paid' },
				{ accepts: ['chip'], path: ['items', 0] },
			);

			expect(result).toEqual({
				success: false,
				issues: [
					{
						code: 'registry/not-accepted',
						message: "$type 'badge' is not accepted here. Expected 'chip'.",
						path: ['items', 0, '$type'],
						expected: ['chip'],
						received: 'badge',
					},
				],
			});
		});

		it('reads Expected one of for a list of several', () => {
			const result = safeParseNode(badges, { $type: 'badge' }, { accepts: ['chip', 'tag'] });

			expect(!result.success && result.issues[0]?.message).toBe(
				"$type 'badge' is not accepted here. Expected one of 'chip', 'tag'.",
			);
		});

		it('is checked before the lookup, so a $type nothing registers is not accepted, not unregistered', () => {
			const result = safeParseNode(badges, { $type: 'chip' }, { accepts: ['badge'] });

			expect(!result.success && result.issues).toMatchObject([
				{ code: 'registry/not-accepted', received: 'chip' },
			]);
		});

		it('leaves the issues of an accepted but unregistered $type, a missing $type and a non-object as they are', () => {
			const lookup = { get: (type: string) => badges.get(type), hint: 'Register it with defineBadge.' };

			expect(safeParseNode(lookup, { $type: 'chip' }, { accepts: ['chip'] })).toMatchObject({
				issues: [
					{
						code: 'registry/unregistered-type',
						message: "No registration for $type 'chip'. Register it with defineBadge.",
					},
				],
			});
			expect(safeParseNode(badges, {}, { accepts: ['badge'] })).toMatchObject({
				issues: [{ code: 'registry/missing-type' }],
			});
			expect(safeParseNode(badges, 7, { accepts: ['badge'] })).toMatchObject({
				issues: [{ code: 'registry/not-an-object' }],
			});
		});

		it('throws for an empty list, a caller bug', () => {
			expect(() => safeParseNode(badges, { $type: 'badge' }, { accepts: [] })).toThrow(
				'accepts must name at least one $type.',
			);
		});
	});

	it('leaves the code and the fields of an issue of the schema as the schema library wrote them', () => {
		const node: unknown = JSON.parse('{ "$type": "badge", "label": 5 }');
		const own = badge.schema['~standard'].validate(node) as unknown as { issues: { code?: string }[] };
		const result = safeParseNode(badges, node);

		expect(!result.success && result.issues[0]).toEqual({ ...own.issues[0], path: ['label'] });
		expect(!result.success && result.issues[0]?.code).toBe('invalid_type');
	});

	it('works with a mutable registry', () => {
		const registry = createMutableRegistry<BaseRegistration>('Badge');
		registry.register(badge);

		expect(safeParseNode(registry, { $type: 'badge', label: 'Paid' }).success).toBe(true);
	});

	it('throws for a schema that validates asynchronously', () => {
		const later: BaseRegistration = {
			$type: 'later',
			schema: { '~standard': { version: 1, vendor: 'test', validate: async () => ({ value: 1 }) } },
			metadata: { name: 'Later' },
		};

		expect(() => safeParseNode(createRegistry('Later', [later]), { $type: 'later' })).toThrow(
			'Async Standard Schema validation',
		);
	});
});
