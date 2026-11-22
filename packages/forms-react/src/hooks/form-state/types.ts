import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import type { FormActionTrigger, NormalizedFormConfig, SubmissionActionResult } from '@schema-engine/forms';
import type { DeepReadonly } from '@schema-engine/forms/lib/normalized-form-config';
import type { FormActionConfig } from '@schema-engine/forms/schemas';
import type { FieldArrayValue, FormIssueFormatter, NativeOptions } from '@schema-engine/forms/state-container';
import type { ReactNode, RefCallback } from 'react';

/** The nested values of a form, as the container holds them and a submission hands them over. */
export type FormValues = Readonly<Record<string, unknown>>;

/**
 * What `useFormContext` returns: the commands over the form and a lazily tracked `formState`.
 *
 * @remarks
 * `formState` is read through getters, and a component re-renders only for the keys it reads: a submit
 * button that reads `isSubmitting` does not re-render while the user types. `errors` and `touchedFields`
 * are flat by dotted path (`contacts.0.email`). An error is its text, which the provider's `formatIssue`
 * makes or else the issue's own `message`, and it is absent when there is neither.
 */
export interface FormContextValue {
	/** The values the form holds now. */
	getValues: () => FormValues;
	/**
	 * Writes the branch at `name` as a change.
	 *
	 * @remarks
	 * A widget that wraps a native input with constraints passes what the control reports with the value,
	 * `{ native: { type: 'tooShort', params: { minLength: 8 } } }`, or `{ native: null }` when it reports itself
	 * valid. A controlled widget passes none and relies on the engine's rules.
	 */
	setValue: (name: string, value: unknown, options?: NativeOptions) => void;
	/** Validates `name` (a path or several; the whole form when omitted) and resolves whether it passed. */
	trigger: (name?: string | readonly string[]) => Promise<boolean>;
	/** Focuses the control a field registered with the `ref` of `useFormField`. */
	setFocus: (name: string) => void;
	formState: {
		errors: Record<string, { message?: string }>;
		/** Whether no error from any source is recorded. Cheap, and no proof that the values are valid. */
		isValid: boolean;
		isSubmitting: boolean;
		touchedFields: Record<string, boolean>;
		/** The submissions that ended, whether they passed or failed validation. */
		submitCount: number;
		defaultValues?: FormValues;
	};
}

/**
 * What `useFormField` binds a widget to.
 *
 * @remarks
 * `error` and `warning` are texts, from the provider's `formatIssue` or else the issue's own `message`.
 * A field can be `invalid` with no `error` to show, when nothing says what is wrong in words, so a widget
 * marks itself invalid from `invalid` and not from the text.
 */
export interface FormFieldValue {
	value: unknown;
	error?: string;
	warning?: string;
	/** Whether the field has a blocking error, whatever its text. */
	invalid: boolean;
	/** Writes the value; a widget that wraps a native input with constraints adds `{ native }`. */
	onChange: (value: unknown, options?: NativeOptions) => void;
	onBlur: () => void;
	name: string;
	required: boolean;
	disabled?: boolean;
	ref: RefCallback<HTMLElement | null>;
}

export type { FieldArrayValue };

/**
 * An action of a normalized form config, as the registrations of the engine type it: frozen, like the config.
 */
export type FormProviderAction<TOutputs extends EngineOutputMaps = EngineOutputMaps> = DeepReadonly<
	FormActionConfig<TOutputs['actions']>
>;

/**
 * Props for the FormProvider component
 */
export interface FormProviderProps<TOutputs extends EngineOutputMaps = EngineOutputMaps> {
	/**
	 * The form, normalized by the engine (`engine.validateForm`).
	 *
	 * @remarks Its `validationMode`, `reValidateMode` and `payload` go to the form's container as they are.
	 */
	config: NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>;
	/** Optional default values for form fields */
	defaultValues?: Record<string, unknown>;
	/** React children to render inside the form context */
	children: ReactNode;
	/** Callback function executed on successful form submission, with the values that passed validation */
	onSubmit?: (data: FormValues) => void | Promise<void>;
	/** Callback function executed whenever form data changes */
	onChange?: (data: FormValues) => void;
	/** Callback function executed when a form action is triggered */
	onAction?: (action: FormProviderAction<TOutputs>, data: FormValues) => void | Promise<void>;
	/** Results of each action trigger, including submission failures. */
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	/**
	 * Turns an issue into the text a field shows, for this form.
	 *
	 * @remarks Overrides the engine's `formatIssue` (`createFormEngine({ formatIssue })`) and the one of the enclosing `FormEngineProvider`.
	 */
	formatIssue?: FormIssueFormatter;
}
