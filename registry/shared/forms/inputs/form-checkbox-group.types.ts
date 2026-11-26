import type { CheckboxGroupFieldConfig } from '@schema-engine/forms/elements';

export {
	CheckboxGroupOptionSchema,
	CheckboxGroupFieldExtensionSchema,
	CheckboxGroupFieldConfigSchema,
	checkboxGroupFieldValue,
} from '@schema-engine/forms/elements';
export type {
	CheckboxGroupOption,
	CheckboxGroupFieldExtension,
	CheckboxGroupFieldConfig,
} from '@schema-engine/forms/elements';

export type CheckboxGroupFieldProps = CheckboxGroupFieldConfig & {
	onChange?: (value: (string | number)[]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
