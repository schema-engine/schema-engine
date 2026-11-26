import type { MaskedInputFieldConfig } from '@schema-engine/forms/elements';

export {
	MaskedInputFieldExtensionSchema,
	MaskedInputFieldSchema,
	maskedInputFieldExample,
	maskedInputFieldValue,
} from '@schema-engine/forms/elements';
export type { MaskedInputFieldConfig } from '@schema-engine/forms/elements';

export type MaskedInputFieldProps = MaskedInputFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
