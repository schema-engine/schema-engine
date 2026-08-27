/**
 * Drop Zone Element Registration with Type Augmentation
 *
 * Import this file to register the drop-zone element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { DropZoneElementRegistration } from '@components/schema-engine/forms/inputs/form-drop-zone.registration';
 * import { FormComposer } from '@schema-engine/forms/builder';
 *
 * const engine = new FormComposer()
 *   .addElement(DropZoneElementRegistration)
 *   .build();
 * ```
 */

import { FormDropZone } from './form-drop-zone';
import type { DropZoneFieldConfig, DropZoneFieldProps } from './form-drop-zone.types';
import { DropZoneFieldSchema } from './form-drop-zone.types';
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
