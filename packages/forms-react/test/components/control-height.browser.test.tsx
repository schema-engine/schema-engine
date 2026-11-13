import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import {
	controlHeightAcceptance,
	controlHeightForm,
	readControlHeights,
} from '../../../../test-utils/control-height-acceptance';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';
import '@/components/schema-engine/forms/recipes/recipes.css';

const engine = createFormEngine({ elements: [InputElementRegistration, SubmitButtonElementRegistration] });

/**
 * The registry controls are shadcn components, which this suite stands in for with bare elements, so a
 * control has no height of its own: the heights asserted are the renderer-neutral fallbacks of the axis.
 */
describe('React registry controls follow the size axis', () => {
	controlHeightAcceptance(
		async ({ config }) => {
			const view = render(
				<FormRenderer config={engine.validateForm(config)} engine={engine} adapter={rhfAdapter} />,
			);
			return { host: view.container, cleanup: view.unmount, update: async () => undefined };
		},
		{ compact: { input: 28, button: 28 }, comfortable: { input: 36, button: 36 } },
	);

	test('a host class on a control outranks the stylesheet height', () => {
		const author = document.createElement('style');
		author.textContent = '.host-control { height: 50px; }';
		document.head.append(author);
		const view = render(
			<FormRenderer
				config={engine.validateForm(controlHeightForm('compact'))}
				engine={engine}
				adapter={rhfAdapter}
			/>,
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
