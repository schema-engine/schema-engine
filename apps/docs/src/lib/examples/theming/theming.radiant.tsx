import { NotificationActionRegistration } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { themedForm } from './config';
import { theme } from './theme';

/** The same compiled theme goes in as `layout`: both renderers carry one `data-se-theme`. */
export const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	layout: theme,
	actions: [NotificationActionRegistration],
});

/** Renders the themed form. */
export function ThemedForm() {
	return <FormRenderer engine={engine} config={themedForm} />;
}
