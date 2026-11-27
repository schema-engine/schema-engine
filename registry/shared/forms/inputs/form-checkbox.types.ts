import type { CheckboxFieldConfig } from '@schema-engine/forms/default-elements';

export {
	CheckboxFieldExtensionSchema,
	CheckboxFieldConfigSchema,
	checkboxFieldValue,
} from '@schema-engine/forms/default-elements';
export type { CheckboxFieldExtension, CheckboxFieldConfig } from '@schema-engine/forms/default-elements';

export type CheckboxFieldProps = CheckboxFieldConfig & {
	onChange?: (checked: boolean) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
