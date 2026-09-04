import { FormComposer } from '@schema-engine/forms/builder';

/**
 * Factory for a React form composer with no default registrations.
 *
 * Headless means this factory does not bind default view recipes or form
 * elements. `FormRenderer` still lives in this package. Register elements and
 * recipes explicitly — typically `schemaFormRegistrations` and
 * `schemaFormRecipeRegistrations` from the Schema Engine shadcn registry.
 */
export function createReactFormComposer() {
	return new FormComposer();
}
