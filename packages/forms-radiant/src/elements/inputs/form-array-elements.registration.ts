import { ArrayElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormArrayElements } from './form-array-elements.js';

export const ArrayElementRegistration = {
	...ArrayElementContract,
	render: FormArrayElements,
} satisfies ElementBinding<typeof ArrayElementContract>;
