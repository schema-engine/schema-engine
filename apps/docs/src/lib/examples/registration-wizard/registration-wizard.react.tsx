/** @jsxImportSource react */
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { registration } from './config';
import { register } from './submit';
import { elements } from './widgets.react';
import { WizardRecipe } from './wizard.react';

export const engine = createFormEngine({ elements, recipes: [WizardRecipe] });

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
