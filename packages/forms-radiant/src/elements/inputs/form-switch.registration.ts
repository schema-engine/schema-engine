import { defineInput } from '@schema-engine/forms';
import { SwitchElementContract } from '@schema-engine/forms/default-elements';
import { FormSwitch } from './form-switch.js';

export const SwitchElementRegistration = defineInput({
	...SwitchElementContract,
	render: FormSwitch,
});
