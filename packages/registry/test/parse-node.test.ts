import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { BaseRegistry, createRegistry, safeParseNode, type BaseRegistration } from '../src';

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

	it('puts the path of the node in front of the path of each schema issue', () => {
		const node: unknown = JSON.parse('{ "$type": "badge", "label": 5, "tone": 1 }');
		const result = safeParseNode(badges, node, ['children', 2]);

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
		expect(safeParseNode(badges, { $type: 'chip' }, [1])).toEqual({
			success: false,
			issues: [{ message: "No registration for $type 'chip'.", path: [1, '$type'] }],
		});
	});

	it.each([null, undefined, 'badge', 7, [], {}, { $type: 7 }])(
		'reports %j, which is not an object with a string $type, at the path of the node',
		(node) => {
			expect(safeParseNode(badges, node, [3])).toEqual({
				success: false,
				issues: [{ message: 'A node is an object with a string $type.', path: [3] }],
			});
		},
	);

	it('works with a mutable registry', () => {
		class Badges extends BaseRegistry<string, BaseRegistration> {
			get registryName() {
				return 'Badge';
			}
		}
		const registry = new Badges();
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
