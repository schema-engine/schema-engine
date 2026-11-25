/** @jsxImportSource react */
import { createFormEngine, NotificationActionRegistration } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { registration } from './config';
import { register } from './submit';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { WizardRecipe } from './wizard.react';

export const engine = createFormEngine({
	elements: schemaFormRegistrations,
	recipes: [WizardRecipe],
	actions: [NotificationActionRegistration],
});

/** Renders the wizard and calls `onRegistered` once the server has created the account. */
export function RegistrationWizard({ onRegistered }: { onRegistered: () => void }) {
	return (
		<FormRenderer
			engine={engine}
			config={registration}
			onSubmit={async (values, helpers) => {
				if (await register(values, helpers)) onRegistered();
			}}
		/>
	);
}
