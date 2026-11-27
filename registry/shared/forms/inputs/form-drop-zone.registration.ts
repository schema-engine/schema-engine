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
import { DropZoneElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const DropZoneElementRegistration = defineInput({
	...DropZoneElementContract,
	render: FormDropZone,
});
