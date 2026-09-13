import { ContextProvider } from '@ecopages/radiant/context';
import { FormStore, formContext, type FormContextValue } from '@ecopages/radiant-ui/form';
import { FormController } from '@/adapters/radiant/controller';
import { flattenValues } from '@/adapters/radiant/controller/values';

const noopUnregister = () => {};

export function provideTestFormStore(host: HTMLElement, store: FormStore): void {
	void new ContextProvider(host as never, {
		context: formContext,
		initialValue: {
			ready: true,
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
	});
}

export function createTestForm(defaultValues: Record<string, unknown> = {}) {
	const host = document.createElement('div');
	const element = document.createElement('rui-form');
	const store = new FormStore({ defaultValues: flattenValues(defaultValues) });
	provideTestFormStore(element, store);
	element.append(host);
	return { form: new FormController(host), store, host, element };
}
