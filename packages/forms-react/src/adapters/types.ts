import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import type { ElementConfig, FormActionConfig, FormConfig } from '@schema-engine/forms/schemas';
import type { FormActionTrigger, NormalizedFormConfig, SubmissionActionResult } from '@schema-engine/forms';
import type { FieldArrayValue } from '@schema-engine/forms/adapters';
import type { ReactNode, RefCallback } from 'react';

export interface FormContextValue<TFormData = Record<string, unknown>> {
	getValues: () => TFormData;
	setValue: (name: string, value: unknown) => void;
	trigger: (name?: string | string[]) => Promise<boolean>;
	setFocus: (name: string) => void;
	formState: {
		errors: Record<string, { message?: string }>;
		isValid: boolean;
		isSubmitting: boolean;
		touchedFields: Record<string, boolean>;
		submitCount: number;
		defaultValues?: Partial<TFormData>;
	};
}

export interface FormFieldValue<TFieldValue = unknown> {
	value: TFieldValue;
	error?: string;
	onChange: (value: TFieldValue) => void;
	onBlur: () => void;
	name: string;
	required: boolean;
	disabled?: boolean;
	ref: RefCallback<HTMLElement | null>;
}

export type { FieldArrayValue };

/**
 * Props for the FormProvider component
 */
export interface FormProviderProps<
	TFormData = Record<string, unknown>,
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	/** Form configuration object defining structure, rules, and actions */
	config:
		| FormConfig<TElements, TRecipes, TActions>
		| NormalizedFormConfig<TOutputs['elements'], TOutputs['recipes'], TOutputs['actions']>;
	/** Optional default values for form fields */
	defaultValues?: Partial<TFormData>;
	/** React children to render inside the form context */
	children: ReactNode;
	/** Callback function executed on successful form submission */
	onSubmit?: (data: TFormData) => void | Promise<void>;
	/** Callback function executed whenever form data changes */
	onChange?: (data: Partial<TFormData>) => void;
	/** Callback function executed when a form action is triggered */
	onAction?: (action: FormActionConfig<TOutputs['actions']>, data: TFormData) => void | Promise<void>;
	/** Results of each action trigger, including submission failures. */
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
}

/**
 * Interface for form adapter implementation.
 *
 * Adapters are the stable integration boundary for form libraries.
 * Field-level validation should be driven through the adapter's form context
 * (`trigger`, `setValue`, `setFocus`) rather than adapter-specific helper
 * methods so different implementations can stay aligned.
 */
export interface FormAdapter<
	TFormData = Record<string, unknown>,
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	/** Hook to access form context (values, errors, state) */
	useFormContext: () => FormContextValue<TFormData>;
	/** Hook to register and manage a specific form field */
	useFormField: <TFieldValue = unknown>(config: ElementConfig<TElements>) => FormFieldValue<TFieldValue>;
	/** Hook to watch a specific field value */
	useWatchField: <TWatchValue = unknown>(name: string | string[]) => TWatchValue;
	/** Hook to watch the entire form value tree */
	useWatchForm: () => TFormData;
	/** Hook to manage a field array */
	useFieldArray: (name: string) => FieldArrayValue;
	/** The FormProvider component to wrap the form */
	FormProvider: React.ComponentType<FormProviderProps<TFormData, TElements, TRecipes, TActions, TOutputs>>;
}
