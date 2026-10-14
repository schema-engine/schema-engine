import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { renderRegisteredElement } from '@/components/internals/render-registered-element';
import { mergeFieldGridHost } from '@/hooks/grid-styles';

const probeSchema = z.object({
	$type: z.literal('probe'),
	id: z.string(),
	name: z.string(),
});

const parentProbeSchema = z.object({
	$type: z.literal('parent-probe'),
	id: z.string(),
	name: z.string(),
});

const childProbeSchema = z.object({
	$type: z.literal('child-probe'),
	id: z.string(),
	name: z.string(),
});

function createProbeEngine(breakpoints: { md: string }, onRender: () => void) {
	return createFormEngine({
		grid: { breakpoints },
		elements: [
			{
				$type: 'probe',
				schema: probeSchema,
				metadata: { name: 'Probe', category: 'input' },
				render: () => {
					onRender();
					return null;
				},
			},
		],
	});
}

function createNestedProbeEngines(captured: string[]) {
	let engineB: ReturnType<typeof createFormEngine>;
	const engineA = createFormEngine({
		grid: { breakpoints: { md: '50rem' } },
		elements: [
			{
				$type: 'parent-probe',
				schema: parentProbeSchema,
				metadata: { name: 'Parent probe', category: 'input' },
				render: () => {
					captured.push(mergeFieldGridHost().themeId);
					renderRegisteredElement(
						engineB.validateElement({ $type: 'child-probe', id: 'child', name: 'child' }),
						engineB,
					);
					captured.push(mergeFieldGridHost().themeId);
					return null;
				},
			},
		],
	});
	engineB = createFormEngine({
		grid: { breakpoints: { md: '60rem' } },
		elements: [
			{
				$type: 'child-probe',
				schema: childProbeSchema,
				metadata: { name: 'Child probe', category: 'input' },
				render: () => {
					captured.push(mergeFieldGridHost().themeId);
					return null;
				},
			},
		],
	});
	return { engineA, engineB };
}

describe('form engine owner', () => {
	test('field hosts resolve the engine that is rendering them', () => {
		const engineB = createFormEngine({ grid: { breakpoints: { md: '60rem' } } });

		let capturedThemeId: string | undefined;
		const engineA = createProbeEngine({ md: '50rem' }, () => {
			capturedThemeId = mergeFieldGridHost().themeId;
		});

		renderRegisteredElement(engineA.validateElement({ $type: 'probe', id: 'probe', name: 'probe' }), engineA);

		expect(capturedThemeId).toBe(engineA.getGridTheme().id);
		expect(capturedThemeId).not.toBe(engineB.getGridTheme().id);
	});

	test('later renders through the same engine still own the field hosts', () => {
		const captured: string[] = [];
		const engineA = createProbeEngine({ md: '50rem' }, () => {
			captured.push(mergeFieldGridHost().themeId);
		});
		const normalized = engineA.validateElement({ $type: 'probe', id: 'probe', name: 'probe' });

		renderRegisteredElement(normalized, engineA);
		renderRegisteredElement(normalized, engineA);

		expect(captured).toEqual([engineA.getGridTheme().id, engineA.getGridTheme().id]);
	});

	test('restores the parent engine after a nested host render', () => {
		const captured: string[] = [];
		const { engineA, engineB } = createNestedProbeEngines(captured);

		renderRegisteredElement(
			engineA.validateElement({ $type: 'parent-probe', id: 'parent', name: 'parent' }),
			engineA,
		);

		expect(captured).toEqual([engineA.getGridTheme().id, engineB.getGridTheme().id, engineA.getGridTheme().id]);
	});
});
