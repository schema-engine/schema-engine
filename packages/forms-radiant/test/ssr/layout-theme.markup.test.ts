import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { builtInAxes, createLayoutTheme, defineAxis } from '@schema-engine/layout';
import { describe, expect, test } from 'vitest';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { expectOneThemeOneStylesheet, expectSharedLayoutTheme } from '../../../../test-utils/ssr-grid-acceptance';
import { createSsrAcceptanceEngine } from './render-form-ssr-html';

await import('@/components/form-instance.script');

const axis = (name: string, ...values: string[]) =>
	defineAxis({
		$type: name,
		metadata: { name },
		default: values[0] ?? 'a',
		values: Object.fromEntries(values.map((value) => [value, {}])),
	});
const tone = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-tone-accent': '#f60' } },
});

const form = {
	id: 'themed',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'ssr-input', id: 'a', name: 'a', label: 'A' }] }],
};

function renderOnEngine(engine: ReturnType<typeof createSsrAcceptanceEngine>): string {
	return withRadiantServerCustomElementRenderBridge(() => {
		const config = engine.validateForm(form);
		return renderToString(
			jsx(ConfiguredRuiForm, {
				config,
				layoutThemeId: engine.getLayout().id,
				children: RecipeRenderer({ config, engine, recipe: undefined }),
			}),
			{ mode: 'plain' },
		);
	});
}

describe('the layout theme in Radiant markup', () => {
	test('a form carries one data-se-theme and one stylesheet for the grid and the appearance rules', () => {
		const engine = createSsrAcceptanceEngine({
			grid: { minColumnWidth: '12rem' },
			appearance: [...builtInAxes, tone],
		});
		const html = renderOnEngine(engine);

		expectOneThemeOneStylesheet(html, engine.getLayout());
		expect(html).toContain('--se-tone-accent:#f60');
	});

	test('two engines on one compiled theme carry the same data-se-theme and the same stylesheet', () => {
		const theme = createLayoutTheme({ appearance: [...builtInAxes, tone] });
		const first = createSsrAcceptanceEngine(theme);
		const second = createSsrAcceptanceEngine(theme);
		const page = `${renderOnEngine(first)}${renderOnEngine(second)}`;

		expect(first.getLayout()).toBe(second.getLayout());
		expectSharedLayoutTheme(page, theme, false);
	});

	test('engines on different themes keep separate ids and stylesheets', () => {
		const first = createSsrAcceptanceEngine({ appearance: [...builtInAxes, axis('tone', 'a', 'x')] });
		const second = createSsrAcceptanceEngine({ appearance: [...builtInAxes, axis('tone', 'b', 'x')] });
		const page = `${renderOnEngine(first)}${renderOnEngine(second)}`;

		expect(first.getLayout().id).not.toBe(second.getLayout().id);
		expect(page).toContain(`data-se-theme-css="${first.getLayout().id}"`);
		expect(page).toContain(`data-se-theme-css="${second.getLayout().id}"`);
	});
});
