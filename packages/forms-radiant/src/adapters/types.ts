import type { FormConfig } from '@schema-engine/forms/schemas';
import type { NormalizedFormConfig, FormConfigView } from '@schema-engine/forms';
import type { FormEngineRuntime } from '@schema-engine/forms/engine/form-engine';
import type { FormIssueFormatter, FormStateErrorsInput } from '@schema-engine/forms/state-container';
import type { JsxRenderable } from '@ecopages/jsx';

/** What `onSubmit` receives beside the values that passed. */
export interface FormSubmitContext {
	/** Shows the server's answer to this submission, by path; `FORM_ROOT` stands for the form itself. */
	setServerErrors: (errors: FormStateErrorsInput) => void;
	/** The engine's request function, with its CSRF policy applied. */
	fetch: FormEngineRuntime['fetch'];
}

export interface FormProviderProps<TFormData = Record<string, unknown>> {
	config: FormConfig | NormalizedFormConfig;
	defaultValues?: Partial<TFormData>;
	children?: JsxRenderable;
	onSubmit?: (data: TFormData, context: FormSubmitContext) => void | Promise<void>;
	onChange?: (data: Partial<TFormData>) => void;
	/**
	 * Turns an issue into the text to show, for the application's language.
	 *
	 * @remarks
	 * It receives the issue (`type`, `ruleId`, `params`, `source` and any `message`) and the path of its field, and
	 * returns the text; `rui-form` falls back to the issue's own `message` when it returns nothing. Without a
	 * formatter an issue shows its `message` and otherwise nothing, never the rule type. The same function type
	 * serves the React renderer.
	 */
	formatIssue?: FormIssueFormatter;
	onAction?: (
		action: Exclude<NonNullable<FormConfigView['actions']>[number], readonly unknown[]>,
		data: TFormData,
	) => void | Promise<void>;
}
