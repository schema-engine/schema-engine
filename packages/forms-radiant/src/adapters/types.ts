import type { FormConfig } from '@schema-engine/forms/schemas';
import type { NormalizedFormConfig, FormConfigView } from '@schema-engine/forms';
import type { FieldArrayValue } from '@schema-engine/forms/adapters';
import type { JsxRenderable } from '@ecopages/jsx';

export interface FormFieldValue<TFieldValue = unknown> {
	readonly value: TFieldValue;
	readonly error?: string;
	onChange: (value: TFieldValue) => void;
	onBlur: () => void;
	name: string;
}

export type { FieldArrayValue };

export interface FormProviderProps<TFormData = Record<string, unknown>> {
	config: FormConfig | NormalizedFormConfig;
	defaultValues?: Partial<TFormData>;
	children?: JsxRenderable;
	onSubmit?: (data: TFormData) => void | Promise<void>;
	onChange?: (data: Partial<TFormData>) => void;
	onAction?: (action: NonNullable<FormConfigView['actions']>[number], data: TFormData) => void | Promise<void>;
}
