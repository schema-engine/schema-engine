import { describe, expect, test } from 'vitest';
import { registry, run } from '../../../../test-utils/skill-examples/actions/dispatch';

describe('the dispatch example of the skill', () => {
	test('a parsed sequence runs in order, and a group runs together, with results in configuration order', async () => {
		const sent: string[] = [];
		const { results } = await run(
			[
				{ $type: 'notify', id: 'first', channel: 'a' },
				[
					{ $type: 'notify', id: 'second', channel: 'b' },
					{ $type: 'notify', id: 'third', channel: 'c' },
				],
				{ $type: 'notify', id: 'last', channel: 'd' },
			],
			sent,
		);

		expect(sent).toEqual(['a', 'b', 'c', 'd']);
		expect(
			results?.map(({ actionId, sequenceIndex, groupIndex, status }) => [
				actionId,
				sequenceIndex,
				groupIndex,
				status,
			]),
		).toEqual([
			['first', 0, undefined, 'succeeded'],
			['second', 1, 0, 'succeeded'],
			['third', 1, 1, 'succeeded'],
			['last', 2, undefined, 'succeeded'],
		]);
	});

	test('a failure with shouldContinue false stops the sequence', async () => {
		const sent: string[] = [];
		const { results } = await run(
			[
				{ $type: 'notify', id: 'broken', channel: 'broken' },
				{ $type: 'notify', id: 'after', channel: 'z' },
			],
			sent,
		);

		expect(sent).toEqual(['broken']);
		expect(results).toMatchObject([{ actionId: 'broken', status: 'failed', error: 'No such channel' }]);
	});

	test('an entry that fails its schema, and a type nothing registers, are issues at their index and never reach a handler', async () => {
		const sent: string[] = [];
		const { issues, results } = await run(
			[
				{ $type: 'notify', id: 'ok', channel: 'a' },
				[
					{ $type: 'notify', id: 'bad' },
					{ $type: 'missing', id: 'unknown' },
				],
			],
			sent,
		);

		expect(results).toBeUndefined();
		expect(issues?.map(({ path }) => path)).toEqual([
			[1, 0, 'channel'],
			[1, 1, '$type'],
		]);
		expect(sent).toEqual([]);
	});

	test('the registry holds the registration by its $type', () => {
		expect(registry.keys()).toEqual(['notify']);
	});
});
