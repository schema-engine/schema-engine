import type { NumberFieldConfig } from '@schema-engine/forms/default-elements';

export {
	NumberFieldExtensionSchema,
	NumberFieldConfigSchema,
	numberFieldValue,
} from '@schema-engine/forms/default-elements';
export type { NumberFieldExtension, NumberFieldConfig } from '@schema-engine/forms/default-elements';

export type NumberFieldProps = NumberFieldConfig & {
	onChange?: (value: number | '') => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
