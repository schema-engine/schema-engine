import type { DropZoneFieldConfig } from '@schema-engine/forms/elements';

export {
	DropZoneFieldExtensionSchema,
	DropZoneFieldSchema,
	dropZoneFieldExample,
	dropZoneFieldValue,
} from '@schema-engine/forms/elements';
export type { DropZoneFieldConfig } from '@schema-engine/forms/elements';

export type DropZoneFieldProps = DropZoneFieldConfig & {
	onChange?: (value: File[]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
	onDropChange?: (files: File[]) => void;
};
