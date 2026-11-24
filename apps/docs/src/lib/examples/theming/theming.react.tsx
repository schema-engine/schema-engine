/** @jsxImportSource react */
import { createFormEngine, NotificationActionRegistration } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { CardRecipe } from './card.react';
import { themedForm } from './config';
import { theme } from './theme';
import { elements } from './widgets.react';

/** The compiled theme goes in as `layout`, so the form carries its `data-se-theme` and the stylesheet applies. */
export const engine = createFormEngine({
	elements,
	recipes: [CardRecipe],
	layout: theme,
	actions: [NotificationActionRegistration],
});

/** Renders the themed form. */
export function ThemedForm() {
	return <FormRenderer engine={engine} config={themedForm} />;
}
