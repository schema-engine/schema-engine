import { afterEach, expect, test } from 'vitest';
import { RUI_CONTROL_CONNECT_EVENT } from '@ecopages/radiant-ui/form';
import { SeInputOtp } from '@/elements/inputs/form-input-otp';
import { SeMaskedInput } from '@/elements/inputs/form-masked-input';
import { SePhoneInput } from '@/elements/inputs/form-phone-input';
import { SeDropZone } from '@/elements/inputs/form-drop-zone';

afterEach(() => document.body.replaceChildren());

const hosts = [SeInputOtp, SeMaskedInput, SePhoneInput, SeDropZone];

test.each(['se-input-otp', 'se-masked-input', 'se-phone-input', 'se-drop-zone'])(
	'%s announces itself when it connects, so a field that registered before it can seed its value',
	async (tag) => {
		expect(hosts.every((host) => typeof host === 'function')).toBe(true);
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
