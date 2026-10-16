/**
 * Drop Zone Element Registration with Type Augmentation
 *
 * Import this file to register the drop-zone element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { DropZoneElementRegistration } from '@components/schema-engine/forms/inputs/form-drop-zone.registration';
 * import { createFormEngine, defineInput } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   elements: [DropZoneElementRegistration],
 * });
 * ```
 */

import { FormDropZone } from './form-drop-zone';
import { DropZoneFieldSchema } from './form-drop-zone.types';
import { defineInput } from '@schema-engine/forms';

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
