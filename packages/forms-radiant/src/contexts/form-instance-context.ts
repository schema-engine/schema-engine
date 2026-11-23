import { createContext } from '@ecopages/radiant/context';

import type { FormRuntime, FormStepState, FormSubmissionState, NavigationOutcome } from '@schema-engine/forms';
import type { FormIssueFormatter, FormStateContainer } from '@schema-engine/forms/state-container';
import type { FormMeta } from '@/lib/instance-view';

/**
 * What a `se-form-instance` publishes to the hosts under it.
 *
 * @remarks
 * Step state and commands are those of the form's runtime. `steps` lists every step in order with `skipped`, `visited`, `complete` and `invalid`, and
 * the commands end with an outcome (`'moved'`, `'invalid'`, `'busy'`, ...).
 */
export interface FormInstanceContextValue {
	/** The id of the current step. */
	current: string;
	steps: readonly FormStepState[];
	/** A `next`, `back` or `goTo` runs. */
	navigating: boolean;
	/** True when a wizard recipe owns navigation and steps toggle visibility. */
	isWizard: boolean;
	/** Serializable form chrome, so a consumer needs no walk to the instance for its config. */
	meta?: FormMeta;
	next: () => Promise<NavigationOutcome>;
	back: () => Promise<NavigationOutcome>;
	goTo: (id: string) => Promise<NavigationOutcome>;
	/** The runtime's submission: its status (`validating` while it is checked, `submitting` once it passed and its actions and `onSubmit` run), its failures and the submissions that ended, a failed validation included, since the form was created or reset. */
	submission: FormSubmissionState;
	/**
	 * The form's state container: values, field state, row ids and validation.
	 *
	 * @remarks
	 * Absent until the instance has a config, an engine and its `rui-form`, and on the server. A new container
	 * replaces it when the config or the engine changes, so a consumer reads it from this context rather than
	 * keeping it.
	 */
	container: FormStateContainer | undefined;
	/**
	 * The form's runtime, for what hands a form over whole, such as `registerFormAgentTool`.
	 *
	 * @remarks
	 * Absent when `container` is. A new runtime replaces it with the container, so read it from this context rather than keeping it.
	 */
	runtime: FormRuntime | undefined;
	/** Turns an issue into text; the application's i18n layer, given to the renderer. */
	formatIssue: FormIssueFormatter | undefined;
}

export const formInstanceContext = createContext<FormInstanceContextValue | undefined>(
	Symbol.for('se-form-instance-context'),
);
