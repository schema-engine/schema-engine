import type { FormConfig } from '@schema-engine/forms/schemas';
import type { NormalizedFormConfig, FormConfigView } from '@schema-engine/forms';
import type { FieldArrayValue } from '@schema-engine/forms/state-container';
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
	onAction?: (
		action: Exclude<NonNullable<FormConfigView['actions']>[number], readonly unknown[]>,
		data: TFormData,
	) => void | Promise<void>;
}
