import { FormDropZone } from './form-drop-zone';
import { DropZoneFieldSchema } from './form-drop-zone.types';
import { defineInput } from '@schema-engine/forms';

export const DropZoneElementRegistration = defineInput({
	$type: 'drop-zone',
	appearanceAxes: ['size'],
	render: FormDropZone,
	schema: DropZoneFieldSchema,
	metadata: {
		name: 'Drop Zone',
		description: 'File upload drop-zone with drag-and-drop support and validation rules',
		category: 'input',
	},
});
