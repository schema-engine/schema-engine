import type { FormStateStore } from '@ecopages/radiant-ui/form';
import type { FormStateContainer, FormStateError } from '@schema-engine/forms/state-container';

const stores = new WeakMap<FormStateContainer, FormStateStore<FormStateError>>();

/**
 * The container as the `FormStateStore` a `rui-form` is given with `connect`.
 *
 * @remarks
 * Radiant UI's `validate()` resolves a boolean, while the container's resolves how the check ended (`passed`,
 * `invalid` or `overtaken`), so that member is the only one adapted: an overtaken check is not valid. The
 * instance gives `connect` a `submitHandler`, so `rui-form` never validates on its own and the runtime reads the
 * outcome from the container. The same container always gets the same store, because `connect` rebinds only for
 * a different one. Remove this when Radiant UI's `FormStateStore.validate` resolves the container's result.
 */
export function toRadiantStore(container: FormStateContainer): FormStateStore<FormStateError> {
	let store = stores.get(container);
	if (!store) {
		store = { ...container, validate: async () => (await container.validate()).outcome === 'passed' };
		stores.set(container, store);
	}
	return store;
}
