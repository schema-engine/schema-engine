import { describe, expect, test } from 'vitest';
import { docsReactFormEngine } from '../src/components/react-form-demo/demo-engine';
import { addressForm } from '../src/lib/examples/address-form/config';
import { acmeForm } from '../src/lib/examples/acme-theme/config';
import { brandForm } from '../src/lib/examples/brand-theme/config';
import { brandFrameForm } from '../src/lib/examples/brand-frame/config';
import { checkoutWizard } from '../src/lib/examples/checkout-wizard/config';
import { contactCard } from '../src/lib/examples/contact-card/config';
import { contactForm } from '../src/lib/examples/contact-form/config';
import { drawnLayout } from '../src/lib/examples/drawn-layout/config';
import { registration } from '../src/lib/examples/registration-wizard/config';
import { checkoutForm, profileForm } from '../src/lib/examples/shared-theme/config';
import { tightForm } from '../src/lib/examples/tight-size/config';
import { docsEngines, formEngine } from '../src/lib/form-engine-setup';

describe('the configs of the forms examples', () => {
	test.each([
		['contact form', contactForm],
		['registration wizard', registration],
	])('the %s is accepted by the docs engine of each renderer, which the live demos run', (_name, config) => {
		expect(() => formEngine.validateForm(config)).not.toThrow();
		expect(() => docsReactFormEngine.validateForm(config)).not.toThrow();
	});
});

describe('the configs of the layout examples', () => {
	test.each([
		['contact card', contactCard],
		['tight size', tightForm],
		['brand frame', brandFrameForm],
	])('the %s is accepted by the docs engine of each renderer, which its demos run', (_name, config) => {
		expect(() => formEngine.validateForm(config)).not.toThrow();
		expect(() => docsReactFormEngine.validateForm(config)).not.toThrow();
	});

	test.each([
		['address form', addressForm, 'default'],
		['checkout wizard', checkoutWizard, 'default'],
		['drawn layout', drawnLayout, 'default'],
		['brand theme', brandForm, 'default'],
		['acme theme', acmeForm, 'default'],
		['checkout form of the shared theme', checkoutForm, 'checkout'],
		['profile form of the shared theme', profileForm, 'profile'],
	] as const)('the %s is accepted by the %s docs engine its Radiant demo runs', (_name, config, engine) => {
		expect(() => docsEngines[engine].validateForm(config)).not.toThrow();
	});

	test('every docs engine runs on the one theme, so every demo carries one theme id', () => {
		const ids = Object.values(docsEngines).map((engine) => engine.getLayout().id);
		expect(new Set(ids).size).toBe(1);
		expect(docsReactFormEngine.getLayout().id).toBe(ids[0]);
	});
});
