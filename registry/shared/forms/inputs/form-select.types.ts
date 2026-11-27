import type { SelectOption, SelectFieldConfig } from '@schema-engine/forms/default-elements';

export {
	SelectOptionSchema,
	SelectFieldExtensionSchema,
	SelectFieldConfigSchema,
	selectFieldValue,
} from '@schema-engine/forms/default-elements';
export type { SelectOption, SelectFieldExtension, SelectFieldConfig } from '@schema-engine/forms/default-elements';

export type SelectFieldProps = SelectFieldConfig & {
	onChange?: (value: SelectOption['value'] | SelectOption['value'][]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
