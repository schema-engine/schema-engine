import type { InputFieldOutput } from '@schema-engine/forms/elements';

export {
	InputFieldExtensionSchema,
	InputFieldSchema,
	inputFieldExample,
	inputFieldValue,
} from '@schema-engine/forms/elements';
export type { InputFieldConfig, InputFieldOutput } from '@schema-engine/forms/elements';

export type InputFieldProps = InputFieldOutput & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
