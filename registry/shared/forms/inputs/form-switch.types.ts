import type { SwitchFieldConfig } from '@schema-engine/forms/default-elements';

export {
	SwitchFieldExtensionSchema,
	SwitchFieldConfigSchema,
	switchFieldValue,
} from '@schema-engine/forms/default-elements';
export type { SwitchFieldExtension, SwitchFieldConfig } from '@schema-engine/forms/default-elements';

export type SwitchFieldProps = SwitchFieldConfig & {
	onChange?: (checked: boolean) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
