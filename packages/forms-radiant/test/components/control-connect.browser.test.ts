import { afterEach, expect, test } from 'vitest';
import { mountField } from './mount-field';
import { RUI_CONTROL_CONNECT_EVENT } from '@ecopages/radiant-ui/form';
import { SeInputOtp } from '@/elements/inputs/form-input-otp';
import { SeMaskedInput } from '@/elements/inputs/form-masked-input';
import { SePhoneInput } from '@/elements/inputs/form-phone-input';
import { SeDropZone } from '@/elements/inputs/form-drop-zone';

afterEach(() => document.body.replaceChildren());

void [SeInputOtp, SeMaskedInput, SePhoneInput, SeDropZone];

test.each(['se-input-otp', 'se-masked-input', 'se-phone-input', 'se-drop-zone'])(
	'%s announces itself when it connects, so a field that registered before it can seed its value',
	async (tag) => {
		await customElements.whenDefined(tag);
		const field = document.createElement('div');
		const heard: Element[] = [];
		field.addEventListener(RUI_CONTROL_CONNECT_EVENT, (event) => heard.push(event.target as Element));
		document.body.append(field);

		const host = document.createElement(tag);
		field.append(host);

		await expect.poll(() => heard).toContain(host);
	},
);

test('a field seeds a connected one-time-code host from the value the form holds', async () => {
	const { host } = await mountField({
		$type: 'input-otp',
		id: 'code',
		name: 'code',
		length: 4,
		defaultValue: '1234',
	});
	const slots = () => Array.from(host.querySelectorAll<HTMLInputElement>('se-input-otp input'));
	await expect.poll(() => slots().map((slot) => slot.value)).toEqual(['1', '2', '3', '4']);
});
