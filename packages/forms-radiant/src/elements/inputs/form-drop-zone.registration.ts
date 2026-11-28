import { defineInput } from '@schema-engine/forms';
import { DropZoneElementContract } from '@schema-engine/forms/default-elements';
import { FormDropZone } from './form-drop-zone.js';

export const DropZoneElementRegistration = defineInput({
	...DropZoneElementContract,
	render: FormDropZone,
});
