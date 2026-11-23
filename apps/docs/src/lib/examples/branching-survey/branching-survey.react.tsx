/** @jsxImportSource react */
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { survey } from './config';
import { sendAnswers } from './submit';
import { elements } from './widgets.react';
import { WizardRecipe } from './wizard.react';

export const engine = createFormEngine({ elements, recipes: [WizardRecipe] });

/** Renders the survey and calls `onSent` once the server has the answers. */
export function Survey({ onSent }: { onSent: () => void }) {
	return (
		<FormRenderer
			engine={engine}
			config={survey}
			onSubmit={async (values, helpers) => {
				await sendAnswers(values, helpers);
				onSent();
			}}
		/>
	);
}
