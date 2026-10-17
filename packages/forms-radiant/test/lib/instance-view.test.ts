import { describe, expect, test } from 'vitest';
import { normalizedTestConfig } from '../adapters/test-config';
import { createFormMeta, deriveFormSteps, deriveInitialInstance } from '@/lib/instance-view';

describe('form chrome metadata', () => {
	test('omits field definitions and form runtime configuration from serialized chrome', () => {
		const config = normalizedTestConfig({
			id: 'contact',
			title: 'Contact',
			description: 'Contact details',
			steps: [
				{
					id: 'details',
					title: 'Details',
					description: 'Your details',
					elements: [{ $type: 'input', id: 'name', name: 'name', label: 'Private field label' }],
				},
			],
		});
		const meta = createFormMeta(config);
		expect(meta).toEqual({
			id: 'contact',
			title: 'Contact',
			description: 'Contact details',
			steps: [{ id: 'details', title: 'Details', description: 'Your details' }],
		});
		expect(JSON.stringify(meta)).not.toContain('Private field label');
		expect(meta.steps[0]).not.toBe(config.steps[0]);
		const instance = deriveInitialInstance(meta);
		expect(deriveFormSteps(meta, instance)[0]).toMatchObject({
			id: 'details',
			isActive: true,
			isVisited: true,
			isCompleted: false,
		});
	});
});
