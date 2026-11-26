/**
 * Masked Input Element Registration with Type Augmentation
 *
 * Import this file to register the masked-input element type and get the runtime registration.
 *
 * @example
 * ```typescript
 * import { MaskedInputElementRegistration } from '@components/schema-engine/forms/inputs/form-masked-input.registration';
 * import { createFormEngine, defineInput } from '@schema-engine/forms';
 *
 * const engine = createFormEngine({
 *   elements: [MaskedInputElementRegistration],
 * });
 * ```
 */

import { FormMaskedInput } from './form-masked-input';
import { MaskedInputElementContract } from '@schema-engine/forms/elements';
import { defineInput } from '@schema-engine/forms';

export const MaskedInputElementRegistration = defineInput({
	...MaskedInputElementContract,
	render: FormMaskedInput,
});
