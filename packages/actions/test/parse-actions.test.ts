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
		id: z.string(),
		$type: z.literal('post'),
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

	test('reports an unknown $type at the $type, with a hint to register it', () => {
		const result = parseActions(registry, [[{ id: 'a', $type: 'put' }]]);

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.issues).toEqual([
			{ path: [0, 0, '$type'], message: "Unknown action type 'put'. Register it in the action registry." },
		]);
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

	test('reports an entry that is not an action, and an input that is not a list', () => {
		expect(parseActions(registry, [null, 'post', { id: 'x' }])).toMatchObject({
			success: false,
			issues: [{ path: [0, '$type'] }, { path: [1, '$type'] }, { path: [2, '$type'] }],
		});
		expect(parseActions(registry, { $type: 'post' })).toMatchObject({
			success: false,
			issues: [{ path: [], message: 'Actions must be an array.' }],
		});
	});

	test('an empty sequence parses to an empty sequence', () => {
		expect(parseActions(registry, [])).toEqual({ success: true, data: [] });
	});
});
