import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { registration } from './config';
import { register } from './submit';

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

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
