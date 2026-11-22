/**
 * Compile-time check that the engine's container is the store Radiant UI's `rui-form` is typed by.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import type { FormStateStore, RuiFormElement } from '@ecopages/radiant-ui/form';
import type { FormIssueFormatter, FormStateContainer, FormStateError } from '@schema-engine/forms/state-container';

/**
 * A type with each method rebuilt as a function-typed property.
 *
 * @remarks Methods are compared bivariantly, so a parameter that does not fit would still pass; function-typed properties are compared strictly.
 */
type Strict<T> = {
	[K in keyof T]: T[K] extends (...args: infer Args) => infer Result ? (...args: Args) => Result : T[K];
};

declare const container: FormStateContainer;
declare const form: RuiFormElement;
declare const formatIssue: FormIssueFormatter;

export const store: Strict<FormStateStore<FormStateError>> = container;

form.connect(container, { formatError: formatIssue });
form.connect(container, {
	formatError: (issue, field) => `${field.path}:${issue.source}:${issue.ruleId ?? issue.all.length}`,
	submitHandler: ({ store: injected }) => void injected.getSnapshot().errors,
});
