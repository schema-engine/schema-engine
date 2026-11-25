import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { ActionDispatcher } from '../src/dispatcher';
import { parseActions } from '../src/parse-actions';
import { ActionRegistry } from '../src/registry';
import type { ActionConfigBase, ActionRegistration } from '../src/types';

interface PostConfig extends ActionConfigBase<'post'> {
	endpoint: string;
}

const post: ActionRegistration<PostConfig> = {
	$type: 'post',
	schema: z.object({
		endpoint: z.string(),
		retries: z._default(z.number(), 2),
	}),
	metadata: { name: 'Post', defaultTriggers: ['submit'] },
	execute: ({ config }) => ({ success: true, data: config }),
};

const registry = new ActionRegistry([post]);

describe('parseActions', () => {
	test('parses a JSON workflow with a parallel group, and dispatch runs it', async () => {
		const json = JSON.stringify([
			{ id: 'a', $type: 'post', endpoint: '/a' },
			[
				{ id: 'b', $type: 'post', endpoint: '/b' },
				{ id: 'c', $type: 'post', endpoint: '/c' },
			],
		]);

		const result = parseActions(registry, JSON.parse(json));
		if (!result.success) throw new Error('expected the workflow to parse');
		const results = await new ActionDispatcher(registry).dispatch({
			actions: result.data,
			trigger: 'submit',
			context: {},
		});

		expect(results).toMatchObject([
			{ actionId: 'a', sequenceIndex: 0, success: true },
			{ actionId: 'b', sequenceIndex: 1, groupIndex: 0, success: true },
			{ actionId: 'c', sequenceIndex: 1, groupIndex: 1, success: true },
		]);
	});

	test('returns what the schema returned, so defaults apply', () => {
		const result = parseActions(registry, [{ id: 'a', $type: 'post', endpoint: '/a' }]);

		expect(result).toEqual({ success: true, data: [{ id: 'a', $type: 'post', endpoint: '/a', retries: 2 }] });
	});

	test('reports a wrong argument at the entry and the key', () => {
		const result = parseActions(registry, [{ id: 'a', $type: 'post', endpoint: 3 }]);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map((issue) => issue.path)).toEqual([[0, 'endpoint']]);
	});

	test('reports a wrong argument inside a group at the entry, the member and the key', () => {
		const result = parseActions(registry, [
			{ id: 'a', $type: 'post', endpoint: '/a' },
			[
				{ id: 'b', $type: 'post', endpoint: '/b' },
				{ id: 'c', $type: 'post', endpoint: false },
			],
		]);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map((issue) => issue.path)).toEqual([[1, 1, 'endpoint']]);
	});

	test('reports an unknown $type at the $type', () => {
		const result = parseActions(registry, [[{ id: 'a', $type: 'put' }]]);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues).toEqual([{ path: [0, 0, '$type'], message: "No registration for $type 'put'." }]);
	});

	test('reports every bad entry, not only the first', () => {
		const result = parseActions(registry, [
			{ id: 'a', $type: 'post', endpoint: 1 },
			{ id: 'b', $type: 'put' },
			{ id: 'c', $type: 'post', endpoint: '/c' },
			[{ id: 'd', $type: 'post' }],
		]);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map((issue) => issue.path)).toEqual([
			[0, 'endpoint'],
			[1, '$type'],
			[3, 0, 'endpoint'],
		]);
	});

	test('reports an entry that is not an object at the entry, one without a $type at $type, and an input that is not a list', () => {
		expect(parseActions(registry, [null, 'post', { id: 'x' }])).toEqual({
			success: false,
			issues: [
				{ path: [0], message: 'Expected an object with a string $type.' },
				{ path: [1], message: 'Expected an object with a string $type.' },
				{ path: [2, '$type'], message: 'Expected a string $type.' },
			],
		});
		expect(parseActions(registry, { $type: 'post' })).toMatchObject({
			success: false,
			issues: [{ path: [], message: 'Actions must be an array.' }],
		});
	});

	test('checks the keys every entry carries itself, whatever the schema says', () => {
		const result = parseActions(registry, [
			{ id: '', $type: 'post', endpoint: '/a' },
			{ $type: 'post', endpoint: '/b' },
			{ id: 'c', $type: 'post', endpoint: '/c', enabled: 'yes', triggers: 'submit' },
			{ id: 'd', $type: 'post', endpoint: '/d', triggers: ['submit', 3] },
		]);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues.map((issue) => issue.path)).toEqual([
			[0, 'id'],
			[1, 'id'],
			[2, 'enabled'],
			[2, 'triggers'],
			[3, 'triggers', 1],
		]);
	});

	test('checks triggers against the domain list when given, and any string otherwise', () => {
		const entries = [{ id: 'a', $type: 'post', endpoint: '/a', triggers: ['submit', 'launch'] }];

		expect(parseActions(registry, entries).success).toBe(true);
		const result = parseActions(registry, entries, { triggers: ['change', 'submit'] });
		expect(result).toMatchObject({ success: false, issues: [{ path: [0, 'triggers', 1] }] });
		expect(parseActions(registry, entries, { triggers: ['submit', 'launch'] }).success).toBe(true);
	});

	test('keeps the base keys beside what the schema returned, and does not add the ones left out', () => {
		const result = parseActions(registry, [
			{ id: 'a', $type: 'post', endpoint: '/a', enabled: false, triggers: ['submit'] },
			{ id: 'b', $type: 'post', endpoint: '/b' },
		]);

		expect(result).toEqual({
			success: true,
			data: [
				{ id: 'a', $type: 'post', endpoint: '/a', retries: 2, enabled: false, triggers: ['submit'] },
				{ id: 'b', $type: 'post', endpoint: '/b', retries: 2 },
			],
		});
	});

	test('does not pass the base keys to the schema, so a strict schema lists only the own arguments', () => {
		const strict = new ActionRegistry([{ ...post, schema: z.strictObject({ endpoint: z.string() }) }]);

		expect(parseActions(strict, [{ id: 'a', $type: 'post', endpoint: '/a', triggers: ['submit'] }]).success).toBe(
			true,
		);
		expect(parseActions(strict, [{ id: 'a', $type: 'post', endpoint: '/a', extra: 1 }]).success).toBe(false);
	});

	test('reports a schema that does not return an object at the entry, beside the envelope issues', () => {
		const scalar = new ActionRegistry([
			{
				...post,
				schema: z.pipe(
					z.object({}),
					z.transform(() => 1),
				),
			},
		]);

		expect(parseActions(scalar, [[{ $type: 'post' }]])).toEqual({
			success: false,
			issues: [
				{ path: [0, 0, 'id'], message: 'Action ID must be a non-empty string.' },
				{
					path: [0, 0],
					message: "Invalid action configuration for 'post': the schema must return an object.",
				},
			],
		});
	});

	test('rejects an empty group', () => {
		expect(parseActions(registry, [[]])).toMatchObject({ success: false, issues: [{ path: [0] }] });
	});

	test('an empty sequence parses to an empty sequence', () => {
		expect(parseActions(registry, [])).toEqual({ success: true, data: [] });
	});
});
