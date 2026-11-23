import { ContextProvider } from '@ecopages/radiant/context';
import type { FormRuntime } from '@schema-engine/forms';
import {
	createFormStateContainer,
	type FormIssueFormatter,
	type FormStateContainer,
} from '@schema-engine/forms/state-container';
import { FormController } from '@/adapters/radiant/controller';
import { formInstanceContext } from '@/contexts/form-instance-context';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

/**
 * Publishes `formInstanceContext` with `container` on a plain element, standing in for `se-form-instance`.
 *
 * @remarks
 * `ContextProvider` types its host as a Radiant element, but it only listens for and dispatches context
 * events on it, which any element supports. Pass a plain element: a defined `se-form-instance` already
 * provides the context, and a provider that answers stops propagation.
 */
export function provideTestContainer(
	host: HTMLElement,
	container: FormStateContainer | undefined,
	formatIssue?: FormIssueFormatter,
	runtime?: FormRuntime,
) {
	return new ContextProvider<typeof formInstanceContext>(
		host as unknown as ConstructorParameters<typeof ContextProvider>[0],
		{
			context: formInstanceContext,
			initialValue: {
				current: 'main',
				steps: [
					{ id: 'main', skipped: false, visited: true, complete: false, invalid: false, reachable: false },
				],
				navigating: false,
				isWizard: false,
				next: async () => 'refused',
				back: async () => 'refused',
				goTo: async () => 'refused',
				submission: { status: 'idle', failures: [], submitCount: 0 },
				container,
				runtime,
				formatIssue,
			},
		},
	);
}

/**
 * A form controller over a real container, for a host inside a stand-in form instance.
 *
 * @param fields - The form's elements, validated by an engine, whose rules the container runs.
 */
export function createTestForm(
	defaults: Record<string, unknown> = {},
	fields: Record<string, unknown>[] = [],
	formatIssue?: FormIssueFormatter,
) {
	const { steps } = engine.validateForm({ id: 'test', steps: [{ id: 'main', title: 'Main', elements: fields }] });
	const element = document.createElement('div');
	const host = document.createElement('div');
	const container = createFormStateContainer({
		config: { steps, validationMode: 'onSubmit', reValidateMode: 'onChange' },
		registry: engine.getValidationRegistry(),
		defaults,
	});
	provideTestContainer(element, container, formatIssue);
	element.append(host);
	return { form: new FormController(host), container, host, element };
}
