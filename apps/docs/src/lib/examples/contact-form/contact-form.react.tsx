/** @jsxImportSource react */
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { contactForm } from './config';
import { sendMessage } from './submit';
import { elements } from './widgets.react';

export const engine = createFormEngine({ elements });

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
