import { describe, expect, test, beforeEach } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import { renderRegisteredElement } from '@/components/internals/render-registered-element';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { getDefaultFormEngine, registerFormEngine, resetRegisteredFormEnginesForTests } from '@/registries/active-engine';

const probeSchema = z.object({
	$type: z.literal('probe'),
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

describe('form engine owner', () => {
	beforeEach(() => {
		resetRegisteredFormEnginesForTests();
	});

	test('field hosts resolve the engine that is rendering them, not the active engine', () => {
		const engineB = createFormEngine({ grid: { breakpoints: { md: '60rem' } } });
		registerFormEngine(engineB);

		let capturedThemeId: string | undefined;
		const engineA = createProbeEngine({ md: '50rem' }, () => {
			capturedThemeId = mergeFieldGridHost().themeId;
		});

		renderRegisteredElement(engineA.validateElement({ $type: 'probe', id: 'probe', name: 'probe' }), engineA);

		expect(capturedThemeId).toBe(engineA.getGridTheme().id);
		expect(capturedThemeId).not.toBe(engineB.getGridTheme().id);
		expect(mergeFieldGridHost().themeId).toBe(engineB.getGridTheme().id);
	});

	test('later renders through the same engine still own the field hosts', () => {
		const engineB = createFormEngine({ grid: { breakpoints: { md: '60rem' } } });
		registerFormEngine(engineB);

		const captured: string[] = [];
		const engineA = createProbeEngine({ md: '50rem' }, () => {
			captured.push(mergeFieldGridHost().themeId);
		});
		const normalized = engineA.validateElement({ $type: 'probe', id: 'probe', name: 'probe' });

		renderRegisteredElement(normalized, engineA);
		renderRegisteredElement(normalized, engineA);

		expect(captured).toEqual([engineA.getGridTheme().id, engineA.getGridTheme().id]);
	});
});
