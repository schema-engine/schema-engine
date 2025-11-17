/**
 * Drop Zone Element Registration with Type Augmentation
 *
 * Import this file to register the drop-zone element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { DropZoneElementRegistration } from '@schema-engine/forms-react/components/core-ui/inputs/form-drop-zone.registration';
 * import { FormEngineBuilder } from '@schema-engine/forms/builder';
 *
 * const engine = new FormEngineBuilder()
 *   .addElement(DropZoneElementRegistration)
 *   .build();
 * ```
 */

import { FormDropZone } from './form-drop-zone';
import type { DropZoneFieldConfig, DropZoneFieldProps } from './form-drop-zone.types';
import { DropZoneFieldSchema } from './form-drop-zone.types';
import type { InputRegistration } from '@schema-engine/forms/types';

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
	schema: DropZoneFieldSchema,
	metadata: {
		name: 'Drop Zone',
		description: 'File upload drop-zone with drag-and-drop support and validation rules',
		category: 'input',
	},
};
