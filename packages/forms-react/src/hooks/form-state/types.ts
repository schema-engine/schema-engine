import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import type {
	FormActionTrigger,
	FormSubmissionState as SubmissionState,
	FormSubmitHelpers,
	FormValues,
	NormalizedFormConfig,
	SubmissionActionResult,
} from '@schema-engine/forms';
import type { DeepReadonly } from '@schema-engine/forms/lib/normalized-form-config';
import type { ElementConfig, FormActionConfig } from '@schema-engine/forms/schemas';
import type { RequiredFlagSource } from '@/hooks/is-element-required';
import type {
	FieldArrayValue,
	FormIssueFormatter,
	FormStateError,
	FormStateIssue,
	FormSubmissionIssue,
} from '@schema-engine/forms/state-container';
import type { ChangeEvent, CSSProperties, ReactNode, RefCallback } from 'react';

export type { FormSubmitHelpers, FormValues };

/**
 * What `useFormContext` returns: the commands over the form and a lazily tracked `formState`.
 *
 * @remarks
 * `formState` is read through getters, and a component re-renders only for the keys it reads: a submit
 * button that reads `submission` does not re-render while the user types. `errors` is flat by dotted path
 * (`contacts.0.email`). An error is its text, which the form's formatter makes or else the issue's own
 * `message`, and it is absent when there is neither.
 */
export interface FormContextValue {
	/** The values the form holds now. */
	getValues: () => FormValues;
	/** Writes the branch at `name` as a change. */
	setValue: (name: string, value: unknown) => void;
	/** Validates `name` (a path or several; the whole form when omitted) and resolves whether it passed. */
	validate: (name?: string | readonly string[]) => Promise<boolean>;
	/** Restores the defaults, or replaces them with `values` first, and clears the errors, marks and the submission state: a fresh form. */
	reset: (values?: Record<string, unknown>) => void;
	/** Focuses the control a field registered with the `ref` of `useFormField`. */
	setFocus: (name: string) => void;
	/**
	 * The text of an issue, an issue of a field or why a submission failed, as the form's formatter says.
	 *
	 * @remarks It answers with the issue's own `message` when there is no formatter or it says nothing, and with `undefined` when there is neither. A submission failure takes `FORM_ROOT` as its path.
	 */
	formatIssue: (issue: FormStateIssue | FormSubmissionIssue, field: { readonly path: string }) => string | undefined;
	/** Hides the outcome of the last submission: the status goes back to `idle` and its failures are dropped. */
	clearSubmission: () => void;
	formState: {
		errors: Record<string, { message?: string }>;
		/** Whether no error from any source is recorded. Cheap, and no proof that the values are valid. */
		isValid: boolean;
		/** The one submission state: the status (`pending` while one runs), the failures as issues worded by `formatIssue`, and the submissions that ended, whether they passed or failed validation. */
		submission: SubmissionState;
	};
}

/**
 * The state of the field at a path, as `useFormField` reads it.
 *
 * @remarks
 * `error` and `warning` are texts, from the form's formatter or else the issue's own `message`. A field can be
 * `invalid` with no `error` to show, when nothing says what is wrong in words, so a widget marks itself invalid
 * from `invalid` and not from the text. `issue` is the engine's error, with its `type`, `ruleId`, `params` and
 * every issue in `all`, for a widget that words it itself. It holds no value: `useWatch` reads values.
 */
export interface FormFieldStatus {
	error?: string;
	warning?: string;
	issue: FormStateError | undefined;
	/** Whether the field has a blocking error, whatever its text. */
	invalid: boolean;
	/** Whether the field, a field around it or a field below it has been blurred. */
	isTouched: boolean;
	/** Whether the field or a field below it differs from the defaults. */
	isDirty: boolean;
	/** Whether a check that asked for exactly this field is still running. */
	isValidating: boolean;
}

/**
 * The parts of an element config that `useFormField` reads.
 *
 * @remarks A registration passes its own config as it is: the hook asks for no more than this, so the config of any element type fits.
 */
export type FormFieldConfig = Pick<
	ElementConfig,
	'name' | 'id' | 'disabled' | 'readonly' | 'htmlAttributes' | 'grid' | 'style' | 'constraints'
> &
	RequiredFlagSource;

/** The props a field puts on its control, over the config's `htmlAttributes`. */
export interface FormControlProps {
	id: string | undefined;
	name: string;
	required: boolean;
	disabled: boolean;
	readOnly: boolean | undefined;
	/**
	 * Registers the control with the form: `setFocus` and a failed submit focus it, and when it is an input, select or textarea the form reports what the browser says about its value.
	 *
	 * @remarks A control that is not native can take it too, for focus alone.
	 */
	ref: RefCallback<HTMLElement | null>;
	'aria-invalid': boolean;
	'aria-describedby': string | undefined;
}

/** What an uncontrolled field puts on its native control: {@link FormControlProps} and the handlers that carry the user's changes into the form. */
export interface NativeControlProps extends FormControlProps {
	onChange: (event: ChangeEvent<HTMLElement>) => void;
	onBlur: () => void;
}

/**
 * What the parts of a field that come from its element config are, in either mode.
 *
 * @remarks `required` is the constraint-evaluated one, so a field that a constraint makes required is.
 */
interface FormFieldElement extends FormFieldStatus {
	required: boolean;
	disabled: boolean;
	labelProps: { htmlFor: string | undefined };
	/** Props for the element that shows the error; `null` when there is no text to show. */
	errorProps: { id: string; role: 'alert' } | null;
	containerStyles: CSSProperties;
}

/**
 * What `useFormField` binds a native control to: the field's status and what its config adds.
 *
 * @remarks
 * The control keeps its own value and the field never re-renders for a keystroke. Spread `fieldProps` on
 * the control and give it `defaultValue` (`defaultChecked` for a checkbox, `defaultChecked={value === option}`
 * for a radio). `defaultValue` is frozen when the field mounts, and while the form hydrates it is the
 * server's value, so the markup matches.
 */
export interface FormField extends FormFieldElement {
	/** The value the control starts with, as the container held it when the field mounted. */
	defaultValue: unknown;
	/** Props for the control: its id, name, state attributes and the config's `htmlAttributes`, and the handlers that report its changes. */
	fieldProps: NativeControlProps;
}

/**
 * What `useFormField` binds a component to when it takes only `value` and `onChange` props.
 *
 * @remarks
 * The field re-renders whenever its value changes, since the component shows it. `onChange` writes a value
 * and `onBlur` marks the field blurred. `fieldProps` has no change handler, and its `ref` still serves focus
 * and, when it lands on a native control, the facts the browser reports.
 */
export interface ControlledFormField extends FormFieldElement {
	value: unknown;
	onChange: (value: unknown) => void;
	onBlur: () => void;
	fieldProps: FormControlProps;
}

/** How a field is bound: left out it is uncontrolled, and `controlled: true` is for a component that takes `value` and `onChange`. */
export interface FormFieldOptions {
	controlled?: boolean;
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
	/**
	 * Callback function executed on successful form submission, with the values that passed validation.
	 *
	 * @remarks `setServerErrors` shows the server's answer to this submission on the fields it names.
	 */
	onSubmit?: (data: FormValues, helpers: FormSubmitHelpers) => void | Promise<void>;
	/** Callback function executed whenever form data changes */
	onChange?: (data: FormValues) => void;
	/** Callback function executed when a form action is triggered */
	onAction?: (action: FormProviderAction<TOutputs>, data: FormValues) => void | Promise<void>;
	/** Results of each action trigger, including submission failures. */
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	/**
	 * Turns an issue into the text a field or a submission failure shows, for this form.
	 *
	 * @remarks Overrides the engine's `formatIssue` (`createFormEngine({ formatIssue })`). It is the only per-form override.
	 */
	formatIssue?: FormIssueFormatter;
}
