import { FormDropZone } from './form-drop-zone';
import type { DropZoneFieldConfig } from './form-drop-zone.types';
import { DropZoneFieldSchema } from './form-drop-zone.types';
import { defineInput } from '@schema-engine/forms';

declare global {
	namespace FormEngine {
		interface ElementRegistry {
			'drop-zone': DropZoneFieldConfig;
		}
	}
}

export const DropZoneElementRegistration = defineInput({
	$type: 'drop-zone',
	render: FormDropZone,
	schema: DropZoneFieldSchema,
	metadata: {
		name: 'Drop Zone',
		description: 'File upload drop-zone with drag-and-drop support and validation rules',
		category: 'input',
	},
});
