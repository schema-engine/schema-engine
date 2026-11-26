import type { ComboboxOption, ComboboxFieldConfig } from '@schema-engine/forms/elements';

export {
	ComboboxOptionSchema,
	ComboboxFieldExtensionSchema,
	ComboboxFieldConfigSchema,
	comboboxFieldValue,
} from '@schema-engine/forms/elements';
export type { ComboboxOption, ComboboxFieldExtension, ComboboxFieldConfig } from '@schema-engine/forms/elements';

export type ComboboxFieldProps = ComboboxFieldConfig & {
	onChange?: (value: ComboboxOption['value'] | ComboboxOption['value'][]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
