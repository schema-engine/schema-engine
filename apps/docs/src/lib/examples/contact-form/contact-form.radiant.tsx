import { NotificationActionRegistration } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { contactForm } from './config';
import { sendMessage } from './submit';

export const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	actions: [NotificationActionRegistration],
});

/** Renders the form and calls `onSent` once the server has accepted the message. */
export function ContactForm({ onSent }: { onSent: () => void }) {
	return (
		<FormRenderer
			engine={engine}
			config={contactForm}
			onSubmit={async (values, helpers) => {
				if (await sendMessage(values, helpers)) onSent();
			}}
		/>
	);
}
