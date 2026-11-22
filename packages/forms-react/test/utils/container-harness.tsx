import { useState, type ReactNode } from 'react';
import {
	createFormEngine,
	createFormRuntime,
	type CreateFormRuntimeOptions,
	type FormRuntime,
	type FormRuntimeAction,
} from '@schema-engine/forms';
import type {
	FormIssueFormatter,
	FormStateContainer,
	FormStateContainerConfig,
	FormStateContainerOptions,
} from '@schema-engine/forms/state-container';
import { FormStateContext } from '@/hooks/form-state/context';
import { createFieldRegistry } from '@/hooks/form-state/field-registry';

/** What a test container is built from: the elements of one step and the timing, over the default validation registry. */
interface TestContainerOptions
	extends
		Pick<FormStateContainerOptions, 'defaults'>,
		Pick<CreateFormRuntimeOptions<FormRuntimeAction>, 'onSubmit' | 'onChange' | 'onActionResults'> {
	elements?: FormStateContainerConfig['steps'][number]['elements'];
	validationMode?: FormStateContainerConfig['validationMode'];
	reValidateMode?: FormStateContainerConfig['reValidateMode'];
	payload?: FormStateContainerConfig['payload'];
}

const engine = createFormEngine();
const runtimes = new WeakMap<FormStateContainer, FormRuntime>();

/** The runtime a test container belongs to, for a test that submits or navigates. */
export function runtimeOf(container: FormStateContainer): FormRuntime {
	const runtime = runtimes.get(container);
	if (!runtime) throw new Error('The container was not made by createTestContainer.');
	return runtime;
}

/** A container, built by a runtime over `elements` with the default validation registry. */
export function createTestContainer({
	elements = [],
	validationMode = 'onSubmit',
	reValidateMode = 'onChange',
	payload,
	defaults,
	...callbacks
}: TestContainerOptions): FormStateContainer {
	const runtime = createFormRuntime({
		engine,
		config: { id: 'test', steps: [{ id: 'main', elements }], validationMode, reValidateMode, payload },
		defaults,
		host: { focus: () => undefined },
		...callbacks,
	});
	runtimes.set(runtime.container, runtime);
	return runtime.container;
}

/**
 * Provides the hooks with a container made outside React, so a test drives it directly and reads what the hooks show.
 *
 * @remarks The runtime that built the container is provided with it: `runtimeOf` reaches it.
 */
export function ContainerHarness({
	container,
	formatIssue,
	children,
}: {
	container: FormStateContainer;
	formatIssue?: FormIssueFormatter;
	children: ReactNode;
}) {
	const [{ fields }] = useState(() => ({ fields: createFieldRegistry(container) }));
	return (
		<FormStateContext.Provider value={{ container, formatIssue, fields, runtime: runtimeOf(container) }}>
			{children}
		</FormStateContext.Provider>
	);
}
