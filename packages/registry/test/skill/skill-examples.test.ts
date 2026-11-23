import { describe, expect, test } from 'vitest';
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
