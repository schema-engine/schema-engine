import { ContextProvider } from '@ecopages/radiant/context';
import { createFormRuntime, type FormRuntime } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { FormController } from '@/adapters/radiant/controller';
import { formInstanceContext } from '@/contexts/form-instance-context';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

/**
 * Publishes `formInstanceContext` with a runtime on a plain element, standing in for `se-form-instance`.
 *
 * @remarks
 * `ContextProvider` types its host as a Radiant element, but it only listens for and dispatches context
 * events on it, which any element supports. Pass a plain element: a defined `se-form-instance` already
 * provides the context, and a provider that answers stops propagation.
 */
export function provideTestRuntime(
	host: HTMLElement,
	runtime: FormRuntime | undefined,
	formatIssue?: FormIssueFormatter,
) {
	return new ContextProvider<typeof formInstanceContext>(
		host as unknown as ConstructorParameters<typeof ContextProvider>[0],
		{
			context: formInstanceContext,
			initialValue: {
				current: 'main',
				steps: [
					{
						id: 'main',
						title: 'Main',
						skipped: false,
						visited: true,
						complete: false,
						invalid: false,
						reachable: false,
					},
				],
				navigating: false,
				isWizard: false,
				next: async () => 'refused',
				back: async () => 'refused',
				goTo: async () => 'refused',
				submission: { status: 'idle', failures: [], submitCount: 0 },
				runtime,
				formatIssue,
			},
		},
	);
}

/** A runtime of a form of `fields`, started from `defaults`, which nothing mounts: its container is what a host reads. */
export function createTestRuntime(defaults: Record<string, unknown> = {}, fields: Record<string, unknown>[] = []) {
	const config = engine.validateForm({ id: 'test', steps: [{ id: 'main', title: 'Main', elements: fields }] });
	return createFormRuntime({ engine, config, defaults, host: { focus: () => {} } });
}

/**
 * A form controller over a real runtime, for a host inside a stand-in form instance.
 *
 * @param fields - The form's elements, validated by an engine, whose rules the container runs.
 */
export function createTestForm(
	defaults: Record<string, unknown> = {},
	fields: Record<string, unknown>[] = [],
	formatIssue?: FormIssueFormatter,
) {
	const runtime = createTestRuntime(defaults, fields);
	const element = document.createElement('div');
	const host = document.createElement('div');
	provideTestRuntime(element, runtime, formatIssue);
	element.append(host);
	return { form: new FormController(host), runtime, container: runtime.container, host, element };
}
