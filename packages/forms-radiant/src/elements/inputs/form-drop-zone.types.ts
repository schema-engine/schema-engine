import * as z from 'zod/mini';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';

export const DropZoneFieldExtensionSchema = z.object({
	accept: z.optional(z.record(z.string(), z.array(z.string()))),
	maxSize: z.optional(z.number()),
	minSize: z.optional(z.number()),
	maxFiles: z._default(z.number(), 1),
	disabled: z.optional(z.boolean()),
});

export const DropZoneFieldSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('drop-zone'),
	...DropZoneFieldExtensionSchema.shape,
});

export type DropZoneFieldConfig = z.infer<typeof DropZoneFieldSchema>;

export type DropZoneFieldProps = DropZoneFieldConfig;

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
