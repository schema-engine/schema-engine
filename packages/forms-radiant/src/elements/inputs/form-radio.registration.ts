import { RadioElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormRadio } from './form-radio.js';

export const RadioElementRegistration = {
	...RadioElementContract,
	render: FormRadio,
} satisfies ElementBinding<typeof RadioElementContract>;
