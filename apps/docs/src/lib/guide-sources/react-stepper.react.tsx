/** @jsxImportSource react */
import type { FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { useFormInstanceActions } from '@schema-engine/forms-react/hooks';
import { checkout } from './checkout';
import { engine } from './react-wizard.helper.react';

const titleOf = (id: string) => checkout.steps.find((step) => step.id === id)?.title ?? id;

/** Lists the steps that take part and jumps to one the form lets the visitor reach. */
function Stepper() {
	const { current, steps, goTo } = useFormInstanceActions();
	return (
		<ol aria-label="Steps">
			{steps
				.filter((step) => !step.skipped)
				.map((step) => (
					<li key={step.id}>
						<button
							type="button"
							aria-current={step.id === current ? 'step' : undefined}
							disabled={!step.reachable}
							onClick={() => void goTo(step.id)}
						>
							{titleOf(step.id)}
							{step.invalid ? ' (fix)' : ''}
						</button>
					</li>
				))}
		</ol>
	);
}

/** The checkout with a stepper of its own beside the wizard's Previous and Next. */
export function Checkout({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
	return (
		<FormRenderer engine={engine} config={checkout} onSubmit={onSubmit}>
			<Stepper />
		</FormRenderer>
	);
}
