import { describe, expect, test } from 'vitest';
import { nodeIssues } from '../../../../test-utils/skill-examples/registry/draw-node';
import { radiantWidgets, reactWidgets } from '../../../../test-utils/skill-examples/registry/bound-widgets';
import { readSite } from '../../../../test-utils/skill-examples/registry/site-yaml';
import { widgets } from '../../../../test-utils/skill-examples/registry/widgets';

describe('the registry of the skill', () => {
	test('the last registration of a $type wins and keeps the first position', () => {
		expect(widgets.keys()).toEqual(['card', 'badge']);
		expect(widgets.get('card')?.metadata.name).toBe('Tonal card');
		expect(widgets.size).toBe(2);
		expect(widgets.has('missing')).toBe(false);
	});

	test('the registry is read-only', () => {
		expect(Object.isFrozen(widgets)).toBe(true);
		expect('register' in widgets).toBe(false);
	});
});

describe('the bound registries of the skill', () => {
	test('each renderer binds its part to the one contract, which they share', () => {
		expect(reactWidgets.get('card').render({ title: 'Docs' })).toBe('<h1>Docs</h1>');
		expect(radiantWidgets.get('badge').tag).toBe('se-badge');
		expect(radiantWidgets.get('card').schema).toBe(reactWidgets.get('card').schema);
		expect(radiantWidgets.keys()).toEqual(['card', 'badge']);
	});
});

describe('the node example', () => {
	test('a valid node has no issues', () => {
		expect(nodeIssues({ $type: 'card', title: 'Docs', tone: 'info' }, 0)).toEqual([]);
	});

	test('an issue starts with the position of the node it is about', () => {
		const node: unknown = JSON.parse('{ "$type": "card", "title": 5, "tone": "info" }');
		expect(nodeIssues(node, 2)).toEqual(['children[2].title: Invalid input']);
		expect(nodeIssues({ $type: 'chip' }, 3)).toEqual(["children[3].$type: No registration for $type 'chip'."]);
	});
});

describe('the YAML example', () => {
	test('a valid document is its data', () => {
		expect(readSite('title: Docs\nport: 80\n')).toEqual({ success: true, data: { title: 'Docs', port: 80 } });
	});

	test('an invalid value is an issue at its line and column', () => {
		const result = readSite('title: Docs\nport: eighty\n');

		expect(result.success).toBe(false);
		expect(!result.success && result.issues[0]).toMatchObject({
			path: ['port'],
			line: 2,
			column: 7,
			filename: 'site.yaml',
		});
	});
});
