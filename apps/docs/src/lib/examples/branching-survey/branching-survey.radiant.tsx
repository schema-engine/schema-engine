import { NotificationActionRegistration } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { survey } from './config';
import { sendAnswers } from './submit';

export const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	actions: [NotificationActionRegistration],
});

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
