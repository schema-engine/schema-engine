import { createLayoutTheme } from '@schema-engine/layout';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { expectOneThemeOneStylesheet, expectSharedLayoutTheme } from '../../../../test-utils/ssr-grid-acceptance';
import { createSsrAcceptanceEngine } from './ssr-fixture';

const form = {
	id: 'themed',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'ssr-input', id: 'a', name: 'a', label: 'A' }] }],
};

function Form({ engine }: { engine: ReturnType<typeof createSsrAcceptanceEngine> }) {
	return (
		<FormEngineProvider engine={engine} adapter={rhfAdapter}>
			<FormRenderer engine={engine} adapter={rhfAdapter} config={engine.validateForm(form)} />
		</FormEngineProvider>
	);
}

describe('the layout theme in React markup', () => {
	test('a form carries one data-se-theme and one stylesheet for the grid and the appearance rules', () => {
		const engine = createSsrAcceptanceEngine({
			grid: { minColumnWidth: '12rem' },
			appearance: { tone: { brand: { '--se-tone-accent': '#f60' } } },
		});
		const html = renderToStaticMarkup(<Form engine={engine} />);

		expectOneThemeOneStylesheet(html, engine.getLayout());
		expect(html).toContain('--se-tone-accent:#f60');
	});

	test('two engines on one compiled theme carry the same data-se-theme and share one stylesheet', () => {
		const theme = createLayoutTheme({ appearance: { tone: ['neutral', 'brand'] } });
		const first = createSsrAcceptanceEngine(theme);
		const second = createSsrAcceptanceEngine(theme);
		const page = renderToStaticMarkup(
			<>
				<Form engine={first} />
				<Form engine={second} />
			</>,
		);

		expect(first.getLayout()).toBe(second.getLayout());
		expectSharedLayoutTheme(page, theme, true);
	});
});
