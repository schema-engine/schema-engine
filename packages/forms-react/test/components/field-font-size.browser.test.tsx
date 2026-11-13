import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import '@/components/schema-engine/forms/recipes/recipes.css';
import '@/components/ui/schema-engine/components/controls.css';

const engine = createFormEngine({ elements: [InputElementRegistration] });

/**
 * The documented install of a shadcn app: a Tailwind text utility sits in the `utilities` layer.
 *
 * @remarks
 * `controls.css` is unlayered, so a `font-size` rule of its own would beat the utility even with no pick.
 * The rule falls back with `revert-layer`, so the utility keeps its size until a size is picked.
 */
const stylesheet = document.createElement('style');
stylesheet.textContent = [
	'@layer base, components, utilities;',
	'@layer utilities { .text-big { font-size: 30px; } }',
].join('\n');

beforeAll(() => document.head.prepend(stylesheet));
afterAll(() => stylesheet.remove());

function fieldFontSize(size?: string): string {
	const view = render(
		<FormRenderer
			config={engine.validateForm({
				id: 'font-size',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [
							{
								$type: 'input',
								id: 'email',
								name: 'email',
								label: 'Email',
								className: 'text-big',
								...(size ? { appearance: { size } } : {}),
							},
						],
					},
				],
			})}
			engine={engine}
			adapter={rhfAdapter}
		/>,
	);
	try {
		const field = view.container.querySelector<HTMLElement>('.se-form-field');
		if (!field) throw new Error('The form rendered no field host.');
		return getComputedStyle(field).fontSize;
	} finally {
		view.unmount();
	}
}

describe('a Tailwind text class on a field host', () => {
	test('keeps its size with no size pick', () => {
		expect(fieldFontSize()).toBe('30px');
	});

	test('keeps its size with the default pick', () => {
		expect(fieldFontSize('default')).toBe('30px');
	});

	test('loses to a compact pick, as the documented cost says', () => {
		expect(fieldFontSize('compact')).toBe('14px');
	});
});
