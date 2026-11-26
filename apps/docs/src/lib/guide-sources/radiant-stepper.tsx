import { customElement, RadiantElement } from '@ecopages/radiant';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormValues } from '@schema-engine/forms';
import {
	createRadiantFormEngine,
	FormController,
	FormRenderer,
	schemaFormRegistrations,
} from '@schema-engine/forms-radiant';
import { checkout } from './checkout';

/**
 * Lists the steps that take part and jumps to one the form lets the visitor reach.
 *
 * @remarks
 * `FormController.wizard` is a signal over the form's wizard, and the element renders again each time it changes. The
 * element has to sit inside the form, so it is passed to `FormRenderer` as a child.
 */
@customElement('checkout-stepper')
export class CheckoutStepper extends RadiantElement {
	private readonly form = new FormController(this);
	private readonly wizard = this.form.wizard;
	private stop?: () => void;

	protected override onConnected(): void {
		this.stop = this.wizard.subscribe(() => this.requestUpdate());
	}

	override disconnectedCallback(): void {
		this.stop?.();
		super.disconnectedCallback();
	}

	override render(): JsxRenderable {
		const wizard = this.wizard.get();
		if (!wizard) return null;
		return (
			<ol aria-label="Steps">
				{wizard.steps
					.filter((step) => !step.skipped)
					.map((step) => (
						<li key={step.id}>
							<button
								type="button"
								aria-current={step.id === wizard.current ? 'step' : undefined}
								prop:disabled={!step.reachable}
								on:click={() => void wizard.goTo(step.id)}
							>
								{step.title ?? step.id}
								{step.invalid ? ' (fix)' : ''}
							</button>
						</li>
					))}
			</ol>
		);
	}
}

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

/** The checkout with a stepper of its own beside the wizard's Previous and Next. */
export function Checkout({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
	return (
		<FormRenderer engine={engine} config={checkout} onSubmit={onSubmit}>
			<checkout-stepper />
		</FormRenderer>
	);
}
