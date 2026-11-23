import type { FormValues } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

export const contactForm = engine.defineForm({
	id: 'contact',
	steps: [
		{
			id: 'details',
			title: 'Your details',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ $type: 'required', message: 'Enter your name' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [
						{ $type: 'required', message: 'Enter your email' },
						{ $type: 'email', message: 'Enter a valid email address' },
					],
				},
				{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
			],
		},
	],
});

export function ContactForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
	return <FormRenderer engine={engine} config={contactForm} onSubmit={onSubmit} />;
}
