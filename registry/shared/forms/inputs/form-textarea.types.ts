import type { TextareaFieldConfig } from '@schema-engine/forms/elements';

export {
	TextareaFieldExtensionSchema,
	TextareaFieldSchema,
	textareaFieldExample,
	textareaFieldValue,
} from '@schema-engine/forms/elements';
export type { TextareaFieldConfig } from '@schema-engine/forms/elements';

export type TextareaFieldProps = TextareaFieldConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
	onFocus?: () => void;
};
