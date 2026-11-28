import { SwitchElementContract, type ElementBinding } from '@schema-engine/forms/default-elements';
import { FormSwitch } from './form-switch.js';

export const SwitchElementRegistration = {
	...SwitchElementContract,
	render: FormSwitch,
} satisfies ElementBinding<typeof SwitchElementContract>;
