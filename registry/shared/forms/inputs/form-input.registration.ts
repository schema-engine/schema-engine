/**
 * Input Element Registration with Type Augmentation
 *
 * Import this file to register the input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { InputElementRegistration } from '@components/schema-engine/forms/inputs/form-input.registration';
 * import { createFormEngine } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   elements: [InputElementRegistration],
 * });
 * ```
 */

import { FormInput } from './form-input';
import { InputElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const InputElementRegistration = defineInput({
	...InputElementContract,
	render: FormInput,
});
