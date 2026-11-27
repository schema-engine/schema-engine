import type { RadioOption, RadioFieldConfig } from '@schema-engine/forms/default-elements';

export {
	RadioOptionSchema,
	RadioFieldExtensionSchema,
	RadioFieldConfigSchema,
	radioFieldValue,
} from '@schema-engine/forms/default-elements';
export type { RadioOption, RadioFieldExtension, RadioFieldConfig } from '@schema-engine/forms/default-elements';

export type RadioFieldProps = RadioFieldConfig & {
	onChange?: (value: RadioOption['value']) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
