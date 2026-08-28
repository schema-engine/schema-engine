import { FormDropZone } from './form-drop-zone';
import type { DropZoneFieldConfig, DropZoneFieldProps } from '@/registry/forms/inputs/form-drop-zone.types';
import { DropZoneFieldSchema } from '@/registry/forms/inputs/form-drop-zone.types';
import type { InputRegistration } from '@schema-engine/forms/types';
import { asStandardSchema } from '@schema-engine/forms/lib/standard-schema';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'drop-zone': DropZoneFieldConfig;
		}
	}
}

export const DropZoneElementRegistration: InputRegistration<'drop-zone', DropZoneFieldConfig, DropZoneFieldProps> = {
	$type: 'drop-zone',
	render: FormDropZone,
	schema: asStandardSchema(DropZoneFieldSchema),
	metadata: {
		name: 'Drop Zone',
		description: 'File upload drop-zone with drag-and-drop support and validation rules',
		category: 'input',
	},
};
