import type { FormActionConfig, FormConfig } from '@schema-engine/forms/schemas';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { JsxRenderable } from '@ecopages/jsx';

export interface FormFieldValue<TFieldValue = unknown> {
	readonly value: TFieldValue;
	readonly error?: string;
	onChange: (value: TFieldValue) => void;
	onBlur: () => void;
	name: string;
}

export interface FieldArrayValue {
	fields: Array<{ id: string }>;
	append: (value: unknown) => void;
	prepend: (value: unknown) => void;
	insert: (index: number, value: unknown) => void;
	swap: (indexA: number, indexB: number) => void;
	move: (indexA: number, indexB: number) => void;
	update: (index: number, value: unknown) => void;
	replace: (value: unknown[]) => void;
	remove: (index?: number | number[]) => void;
}

export interface FormProviderProps<TFormData = Record<string, unknown>> {
	config: FormConfig | NormalizedFormConfig;
	defaultValues?: Partial<TFormData>;
	children?: JsxRenderable;
	onSubmit?: (data: TFormData) => void | Promise<void>;
	onChange?: (data: Partial<TFormData>) => void;
	onAction?: (action: FormActionConfig, data: TFormData) => void | Promise<void>;
}

export interface FormAdapter<TFormData = Record<string, unknown>> {
	FormProvider: (props: FormProviderProps<TFormData>) => JsxRenderable;
}
