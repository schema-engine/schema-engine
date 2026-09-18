import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { getFieldGridVariables, getFormGridVariables, type CssVariables } from '@schema-engine/forms/lib/grid-styles';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';

const ssrInputSchema = z.object({
	$type: z.literal('ssr-input'),
	id: z.string(),
	name: z.string(),
	label: z.optional(z.string()),
	grid: z.optional(z.custom<ElementGridConfig>()),
});

function createSsrAcceptanceEngine() {
	return createFormEngine({
		elements: [
			{
				$type: 'ssr-input',
				schema: ssrInputSchema,
				metadata: { name: 'SSR input', category: 'input' },
				render: () => null,
			},
		],
	});
}

let cachedEngine: FormEngine | undefined;

export function getSsrAcceptanceEngine() {
	if (!cachedEngine) {
		cachedEngine = createSsrAcceptanceEngine();
	}
	return cachedEngine;
}

function cssDeclarations(style: CssVariables): string {
	return Object.entries(style)
		.filter((entry): entry is [string, string] => typeof entry[1] === 'string')
		.map(([name, value]) => `${name}:${value}`)
		.join(';');
}

/**
 * Isolated SSR document for the compiled stylesheet and form/field variables
 * the renderer emits (`getCompiledGrid`, `getFormGridVariables`, `getFieldGridVariables`).
 */
export function renderSsrLayoutAcceptanceHtml(): string {
	const engine = getSsrAcceptanceEngine();
	const config = engine.validateForm({
		id: 'ssr-layout-acceptance',
		title: 'SSR layout acceptance',
		grid: {
			columns: 1,
			responsive: { sm: { columns: 2 } },
		},
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'ssr-input',
						id: 'tracked',
						name: 'tracked',
						label: 'Tracked field',
						grid: {
							column: 'span 1',
							responsive: { md: { column: 'span 2', hidden: true } },
						},
					},
					{
						$type: 'ssr-input',
						id: 'visible',
						name: 'visible',
						label: 'Visible field',
					},
				],
			},
		],
	});
	const { theme, css } = engine.getCompiledGrid();
	const tracked = config.steps[0]!.elements[0]!;
	const visible = config.steps[0]!.elements[1]!;
	const gridStyle = cssDeclarations(getFormGridVariables(config.grid, theme));
	const trackedStyle = cssDeclarations(getFieldGridVariables('grid' in tracked ? tracked.grid : undefined));
	const visibleStyle = cssDeclarations(getFieldGridVariables('grid' in visible ? visible.grid : undefined));

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<style data-se-grid-theme="${theme.id}">${css}</style>
<div class="se-form-grid" data-se-grid-theme="${theme.id}" style="${gridStyle}">
<div class="se-form-field" data-se-grid-theme="${theme.id}" style="${trackedStyle}"><label for="tracked">Tracked field</label><input id="tracked" name="tracked" aria-label="Tracked field" readonly></div>
<div class="se-form-field" data-se-grid-theme="${theme.id}" style="${visibleStyle}"><label for="visible">Visible field</label><input id="visible" name="visible" aria-label="Visible field" readonly></div>
</div>
</body></html>`;
}
