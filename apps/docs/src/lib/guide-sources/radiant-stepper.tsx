import { customElement, RadiantElement } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormValues } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { formInstanceContext, type FormInstanceContextValue } from '@schema-engine/forms-radiant/contexts';
import { checkout } from './checkout';

const titleOf = (id: string) => checkout.steps.find((step) => step.id === id)?.title ?? id;

/**
 * Lists the steps that take part and jumps to one the form lets the visitor reach.
 *
 * @remarks
 * `se-form-instance` publishes the wizard on `formInstanceContext`, and the selector re-renders the element each
 * time it changes. The element has to sit inside the form, so it is passed to `FormRenderer` as a child.
 */
@customElement('checkout-stepper')
export class CheckoutStepper extends RadiantElement {
	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const instance = this.instance;
		if (!instance) return null;
		return (
			<ol aria-label="Steps">
				{instance.steps
					.filter((step) => !step.skipped)
					.map((step) => (
						<li key={step.id}>
							<button
								type="button"
								aria-current={step.id === instance.current ? 'step' : undefined}
								prop:disabled={!step.reachable}
								on:click={() => void instance.goTo(step.id)}
							>
								{titleOf(step.id)}
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
