import type { CheckboxFieldConfig } from '@schema-engine/forms/elements';

export {
	CheckboxFieldExtensionSchema,
	CheckboxFieldConfigSchema,
	checkboxFieldValue,
} from '@schema-engine/forms/elements';
export type { CheckboxFieldExtension, CheckboxFieldConfig } from '@schema-engine/forms/elements';

export type CheckboxFieldProps = CheckboxFieldConfig & {
	onChange?: (checked: boolean) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
