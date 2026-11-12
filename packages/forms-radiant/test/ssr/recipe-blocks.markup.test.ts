import { describe, expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { CardRecipe, CardWizardRecipe, SplitScreenRecipe, SplitScreenWizardRecipe, WizardRecipe } from '@/recipes';

const engine = createFormEngine({
	recipes: [CardRecipe, CardWizardRecipe, SplitScreenRecipe, SplitScreenWizardRecipe, WizardRecipe],
});

const steps = [
	{ id: 'one', title: 'One', elements: [] },
	{ id: 'two', title: 'Two', elements: [] },
	{ id: 'three', title: 'Three', elements: [] },
];

function render(config: Record<string, unknown>): string {
	const validated = engine.validateForm({ id: 'recipe-blocks', steps, ...config } as Parameters<
		typeof engine.validateForm
	>[0]);
	return withRadiantServerCustomElementRenderBridge(() =>
		renderToString(FormRenderer({ config: validated, engine }), { mode: 'plain' }),
	);
}

describe('recipe blocks honour the slot config the spec accepts', () => {
	test('the actions step counter is localizable', () => {
		const html = render({
			view: { $type: 'wizard', actions: { labels: { stepCounter: 'Schritt {current} von {total}' } } },
		});

		expect(html).toContain('Schritt 1 von 3');
		expect(html).not.toContain('Step 1 of 3');
	});

	test('the actions step counter is a polite live region', () => {
		expect(render({ view: { $type: 'wizard' } })).toMatch(
			/class="se-wizard-actions__counter"[^>]*aria-live="polite"/,
		);
	});

	test('the actions step counter keeps its English default', () => {
		expect(render({ view: { $type: 'wizard' } })).toContain('Step 1 of 3');
	});

	test('showPercentage false hides only the percentage', () => {
		const html = render({ view: { $type: 'card-wizard', progress: { showPercentage: false } } });

		expect(html).toContain('se-minimal-progress__track');
		expect(html).toContain('Progress');
		expect(html).not.toContain('>33%<');
	});

	test('showPercentage true shows the percentage', () => {
		expect(render({ view: { $type: 'card-wizard' } })).toContain('>33%<');
	});

	test('the card header is centered', () => {
		expect(render({ view: { $type: 'card' }, steps: [steps[0]] })).toContain('data-align="center"');
	});

	test('the header inherits color when asked to', () => {
		const html = render({ view: { $type: 'card', header: { inheritColor: true } }, steps: [steps[0]] });

		expect(html).toContain('se-step-header--inherit-color');
	});

	test('a split-screen-wizard shows the form title once when its steps have no title', () => {
		const html = render({
			title: 'Sign up',
			view: { $type: 'split-screen-wizard' },
			steps: [
				{ id: 'one', title: '', elements: [] },
				{ id: 'two', title: '', elements: [] },
			],
		});

		expect(html.match(/>Sign up</g)).toHaveLength(1);
	});

	test('a split-screen-wizard shows the form title in the panel and the step title in the header', () => {
		const html = render({ title: 'Sign up', view: { $type: 'split-screen-wizard' } });

		expect(html).toMatch(/<h2 class="split-screen-shell__title">Sign up<\/h2>/);
		expect(html).toMatch(/rui-heading__title[^>]*>One</);
	});

	test('a single-step split-screen keeps its panel title', () => {
		const html = render({ title: 'Sign up', view: { $type: 'split-screen' }, steps: [steps[0]] });

		expect(html).toMatch(/<h2 class="split-screen-shell__title">Sign up<\/h2>/);
	});
});
