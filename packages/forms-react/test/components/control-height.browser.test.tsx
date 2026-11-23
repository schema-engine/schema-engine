import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import type { ConformanceMount } from '../../../../test-utils/renderer-conformance';
import {
	controlHeightAcceptance,
	controlHeightForm,
	controlHeightHookAcceptance,
	readControlHeights,
} from '../../../../test-utils/control-height-acceptance';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { MaskedInputElementRegistration } from '@/components/schema-engine/forms/inputs/form-masked-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import recipesCss from '@/components/schema-engine/forms/recipes/recipes.css?inline';
import '@/components/ui/schema-engine/components/controls.css';

const engine = createFormEngine({
	elements: [InputElementRegistration, MaskedInputElementRegistration, SubmitButtonElementRegistration],
});

/**
 * The documented install of a shadcn app, with Tailwind's cascade layers.
 *
 * @remarks
 * The registry controls are shadcn components, whose height is a Tailwind utility (`h-8`) in the
 * `utilities` layer, and utilities outrank every rule in `components`. The stock height here is 32px on
 * every control, set from that layer. `recipes.css` goes into `components`, as the install says; the
 * control stylesheet is imported above, unlayered, which is the only way it outranks the utility. Without
 * a pick it must roll back to the 32px of the utility.
 */
const stylesheet = document.createElement('style');
stylesheet.textContent = [
	'@layer base, components, utilities;',
	'@layer base { *, *::before, *::after { box-sizing: border-box; } }',
	`@layer components { ${recipesCss} }`,
	'@layer utilities { input, button { height: 32px; } }',
].join('\n');

beforeAll(() => document.head.prepend(stylesheet));
afterAll(() => stylesheet.remove());

const mountReact: ConformanceMount = async ({ config }) => {
	const view = render(<FormRenderer config={engine.validateForm(config)} engine={engine} />);
	return { host: view.container, cleanup: view.unmount, update: async () => undefined };
};

describe('React registry controls follow the size axis', () => {
	controlHeightHookAcceptance(mountReact);

	controlHeightAcceptance(mountReact, {
		unpicked: { input: 32, button: 32 },
		compact: { input: 28, button: 28 },
		comfortable: { input: 36, button: 36 },
	});

	test.each([
		['compact', 28],
		['comfortable', 36],
		['default', 32],
	])('a masked input follows the size pick %s beside the plain input', (size, height) => {
		const view = render(
			<FormRenderer
				config={engine.validateForm({
					...controlHeightForm(size),
					steps: [
						{
							id: 'main',
							title: 'Main',
							elements: [
								{ $type: 'masked-input', id: 'iban', name: 'iban', label: 'IBAN', mask: 'aa00' },
								{ $type: 'input', id: 'email', name: 'email', label: 'Email' },
							],
						},
					],
				})}
				engine={engine}
			/>,
		);
		try {
			const heights = Array.from(
				view.container.querySelectorAll('input'),
				(input) => input.getBoundingClientRect().height,
			);
			expect(heights).toEqual([height, height]);
		} finally {
			view.unmount();
		}
	});

	test('a host class on a control outranks the stylesheet height', () => {
		const author = document.createElement('style');
		author.textContent = '.host-control { height: 50px; }';
		document.head.append(author);
		const view = render(
			<FormRenderer config={engine.validateForm(controlHeightForm('compact'))} engine={engine} />,
		);
		try {
			view.container.querySelector('input')!.classList.add('host-control');
			expect(readControlHeights(view.container).input).toBe(50);
		} finally {
			view.unmount();
			author.remove();
		}
	});
});
