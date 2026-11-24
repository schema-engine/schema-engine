import { expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { FormInstance } from '@/components/form-instance';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

const config = engine.validateForm({
	id: 'survey',
	view: { $type: 'wizard' },
	steps: [
		{ id: 'experience', title: 'Experience', elements: [{ $type: 'input', id: 'rating', name: 'rating' }] },
		{
			id: 'problem',
			title: 'Problem',
			constraints: [{ field: 'rating', operator: 'equals', value: 'poor', $type: 'show' }],
			elements: [
				{ $type: 'input', id: 'reason', name: 'reason' },
				{
					$type: 'input',
					id: 'details',
					name: 'details',
					constraints: [{ field: 'reason', operator: 'equals', value: 'other', $type: 'show' }],
				},
			],
		},
	],
});

test('a step the values skip still has its fields in the markup, so the step is not empty when it opens', () => {
	const html = renderToString(jsx(FormInstance, { config, engine }));

	expect(html).toContain('name="reason"');
	expect(html).toMatch(/<se-form-step[^>]*hidden[^>]*data-se-step="problem"/);
});

test('a field of that step with a constraint of its own is rendered hidden, not left out', () => {
	const html = renderToString(jsx(FormInstance, { config, engine }));

	expect(html).toMatch(/<se-constraint[^>]*data-se-constraint-field="details"[^>]*hidden/);
	expect(html).toContain('name="details"');
});

test('a skipped step is hidden at its host when the form has no wizard, and the steps around it are not', () => {
	const single = createFormEngine({ elements: schemaFormRegistrations });
	const form = single.validateForm({
		id: 'survey',
		steps: [
			{ id: 'experience', title: 'Experience', elements: [{ $type: 'input', id: 'rating', name: 'rating' }] },
			{
				id: 'problem',
				title: 'Problem',
				constraints: [{ field: 'rating', operator: 'equals', value: 'poor', $type: 'show' }],
				elements: [{ $type: 'input', id: 'reason', name: 'reason' }],
			},
			{ id: 'thanks', title: 'Thanks', elements: [{ $type: 'input', id: 'note', name: 'note' }] },
		],
	});

	const html = renderToString(jsx(FormInstance, { config: form, engine: single }));
	const hosts = [...html.matchAll(/<se-form-step\b[^>]*>/g)].map((match) => match[0]);

	expect(hosts).toHaveLength(3);
	expect(hosts.map((host) => /\bhidden\b/.test(host))).toEqual([false, true, false]);
	expect(html).toContain('name="reason"');
});
