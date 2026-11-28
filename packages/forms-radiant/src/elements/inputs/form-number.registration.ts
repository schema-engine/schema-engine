import { NumberElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormNumber } from './form-number.js';

export const NumberElementRegistration = {
	...NumberElementContract,
	render: FormNumber,
} satisfies ElementBinding<typeof NumberElementContract>;
