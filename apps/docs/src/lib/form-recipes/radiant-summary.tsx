import { effect } from '@ecopages/signals';
import * as z from 'zod/mini';
import { defineStatic } from '@schema-engine/forms';
import { selectFieldState } from '@schema-engine/forms/state-container';
import { createRadiantFormEngine, FormController, schemaFormRegistrations } from '@schema-engine/forms-radiant';

/**
 * Counts the contacts and says whether the first one is invalid, from the container of the form it sits in.
 *
 * @remarks
 * The controller finds the form through the host's ancestors, so the element has to be rendered inside the
 * form. The signals are made once, as fields, and read inside an effect that follows them.
 */
class ContactSummary extends HTMLElement {
	readonly form = new FormController(this);
	readonly count = this.form.select((snapshot) => snapshot.rowIds['contacts']?.length ?? 0);
	readonly invalid = this.form.select((snapshot) => selectFieldState(snapshot, 'contacts.0.email').invalid);

	private stop?: () => void;

	connectedCallback() {
		this.stop = effect(() => {
			this.textContent = `${this.count.get() ?? 0} contacts, first invalid: ${this.invalid.get() ?? false}`;
		});
	}

	disconnectedCallback() {
		this.stop?.();
	}
}

customElements.define('contact-summary', ContactSummary);

const SummaryRegistration = defineStatic({
	$type: 'summary',
	schema: z.looseObject({ $type: z.literal('summary') }),
	metadata: { name: 'Summary', category: 'content' },
	render: () => <contact-summary />,
});

export const engine = createRadiantFormEngine({ elements: [...schemaFormRegistrations, SummaryRegistration] });
