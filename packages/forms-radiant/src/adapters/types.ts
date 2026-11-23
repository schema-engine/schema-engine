import type { FormConfigView, FormEngineRuntime } from '@schema-engine/forms';
import type { FormStateErrorsInput } from '@schema-engine/forms/state-container';

/** What `onSubmit` receives beside the values that passed. */
export interface FormSubmitContext {
	/** Shows the server's answer to this submission, by path; `FORM_ROOT` stands for the form itself. */
	setServerErrors: (errors: FormStateErrorsInput) => void;
	/** The engine's request function, with its CSRF policy applied. */
	fetch: FormEngineRuntime['fetch'];
}

/** An action of a form config, as `onAction` receives it when its submit action succeeded. */
export type FormAction = Exclude<NonNullable<FormConfigView['actions']>[number], readonly unknown[]>;
