import { FormSwitch } from './form-switch';
import { SwitchElementContract } from '@schema-engine/forms/default-elements';
import { defineInput } from '@schema-engine/forms';

export const SwitchElementRegistration = defineInput({
	...SwitchElementContract,
	render: FormSwitch,
});
