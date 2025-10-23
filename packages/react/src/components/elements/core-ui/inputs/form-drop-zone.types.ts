import { z } from 'zod';
import { BaseFieldSchema } from '@json-form-engine/core/schemas/base-field';

export const DropZoneFieldExtensionSchema = z.object({
	accept: z.record(z.string(), z.array(z.string())).optional(),
	maxSize: z.number().optional(),
	minSize: z.number().optional(),
	maxFiles: z.number().default(1),
	disabled: z.boolean().optional(),
});

export const DropZoneFieldSchema = BaseFieldSchema.extend({
	$type: z.literal('drop-zone'),
	...DropZoneFieldExtensionSchema.shape,
});

export type DropZoneFieldConfig = z.infer<typeof DropZoneFieldSchema>;

export type DropZoneFieldProps = DropZoneFieldConfig & {
	onChange?: (value: File[]) => void;
	onBlur?: () => void;
	onFocus?: () => void;
	onDropChange?: (files: File[]) => void;
};

export const dropZoneFieldExample: DropZoneFieldConfig = {
	$type: 'drop-zone',
	name: 'fileUpload',
	label: 'Upload File',
	description: 'Drag and drop or click to upload',
	maxFiles: 1,
	accept: {
		'application/pdf': ['.pdf'],
	},
};
