import { ContextProvider } from '@ecopages/radiant/context';
import { FormStore, formContext, type FormContextValue } from '@ecopages/radiant-ui/form';
import { FormController } from '@/adapters/radiant/controller';
import { flattenValues } from '@/adapters/radiant/controller/values';

const noopUnregister = () => {};

/**
 * Publishes `formContext` on a plain element, standing in for `rui-form`.
 *
 * @remarks
 * `ContextProvider` types its host as a Radiant element, but it only listens
 * for and dispatches context events on it, which any element supports.
 */
export function provideTestFormStore(host: HTMLElement, store?: FormStore, ready = true) {
	return new ContextProvider<typeof formContext>(
		host as unknown as ConstructorParameters<typeof ContextProvider>[0],
		{
			context: formContext,
			initialValue: {
				ready,
				store,
				revision: 0,
				fields: {},
				errors: {},
				actions: {
					register: () => noopUnregister,
					updateFieldOptions: () => {},
					handleFieldChange: () => {},
					handleFieldBlur: () => {},
					subscribePresentation: () => noopUnregister,
				},
			} satisfies FormContextValue,
		},
	);
}

export function createTestForm(defaultValues: Record<string, unknown> = {}) {
	const host = document.createElement('div');
	const element = document.createElement('rui-form');
	const store = new FormStore({ defaultValues: flattenValues(defaultValues) });
	provideTestFormStore(element, store);
	element.append(host);
	return { form: new FormController(host), store, host, element };
}
