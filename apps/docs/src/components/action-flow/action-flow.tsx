import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './action-flow.css';

export const ActionFlow = eco.component<Record<string, never>, JsxRenderable>({
	render: () => (
		<figure class="action-flow not-prose" aria-label="Action execution flow">
			<figcaption>From trigger to results</figcaption>
			<ol class="action-flow__steps">
				<li data-flow-step="trigger">
					<strong>Trigger</strong>
					<span>A caller dispatches an event and context.</span>
				</li>
				<li data-flow-step="match">
					<strong>Match</strong>
					<span>The dispatcher selects enabled actions for the trigger.</span>
				</li>
				<li data-flow-step="execute">
					<strong>Execute in order</strong>
					<span>Each matching action receives its config and trigger.</span>
				</li>
				<li data-flow-step="result">
					<strong>Stop or continue</strong>
					<span>
						After each action, the dispatcher decides whether to continue. A failed action stops later
						actions only when it returns <code>shouldContinue: false</code>.
					</span>
				</li>
			</ol>
		</figure>
	),
});
