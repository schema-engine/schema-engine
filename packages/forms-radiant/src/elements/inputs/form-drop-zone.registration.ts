import { DropZoneElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormDropZone } from './form-drop-zone.js';

export const DropZoneElementRegistration = {
	...DropZoneElementContract,
	render: FormDropZone,
} satisfies ElementBinding<typeof DropZoneElementContract>;
