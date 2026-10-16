import { expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/elements/inputs/form-input.registration';
import { SplitScreenWizardRecipe } from '@/recipes';

test('a large wizard serializes full config only on its instance host', () => {
	const engine = createFormEngine({ elements: [InputElementRegistration], recipes: [SplitScreenWizardRecipe] });
	const config = engine.defineForm({
		id: 'large-ssr-form',
		title: 'Large form',
		view: { $type: 'split-screen-wizard' },
		steps: Array.from({ length: 12 }, (_, stepIndex) => ({
			id: `step-${stepIndex}`,
			title: `Step ${stepIndex + 1}`,
			elements: Array.from({ length: 20 }, (field, fieldIndex) => ({
				$type: 'input' as const,
				id: `field-${stepIndex}-${fieldIndex}`,
				name: `field_${stepIndex}_${fieldIndex}`,
				label: `Field ${stepIndex}-${fieldIndex}`,
			})),
		})),
	});
	const html = withRadiantServerCustomElementRenderBridge(() =>
		renderToString(FormRenderer({ config, engine }), { mode: 'plain' }),
	);
	const hostsWithConfig = [...html.matchAll(/<([\w-]+)\b[^>]*\sconfig=/g)].map((match) => match[1]);
	expect(hostsWithConfig).toEqual(['se-form-instance']);
	for (const name of ['se-step-header', 'se-step-indicators', 'se-wizard-actions', 'se-split-screen-side']) {
		const host = html.match(new RegExp(`<${name}\\b[^>]*>`))?.[0];
		expect(host, name).toBeDefined();
		expect(host, name).toContain('meta=');
		expect(host, name).not.toContain('field_11_19');
	}
	expect(html).toContain('name="field_11_19"');
}, 15_000);
