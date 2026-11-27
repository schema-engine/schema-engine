import type { PhoneInputFieldOutput } from '@schema-engine/forms/default-elements';

export {
	PhoneInputFieldExtensionSchema,
	PhoneInputFieldSchema,
	phoneInputFieldExample,
	phoneInputFieldValue,
} from '@schema-engine/forms/default-elements';
export type { PhoneInputFieldConfig, PhoneInputFieldOutput } from '@schema-engine/forms/default-elements';

export type PhoneInputFieldProps = PhoneInputFieldOutput & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
