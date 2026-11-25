import { describe, expect, test } from 'vitest';
import { docsReactFormEngine } from '../src/components/react-form-demo/demo-engine';
import { contactForm } from '../src/lib/examples/contact-form/config';
import { registration } from '../src/lib/examples/registration-wizard/config';
import { themedForm } from '../src/lib/examples/theming/config';
import { formEngine } from '../src/lib/form-engine-setup';

describe('the configs of the forms examples', () => {
	test.each([
		['contact form', contactForm],
		['registration wizard', registration],
		['themed form', themedForm],
	])('the %s is accepted by the docs engine of each renderer, which the live demos run', (_name, config) => {
		expect(() => formEngine.validateForm(config)).not.toThrow();
		expect(() => docsReactFormEngine.validateForm(config)).not.toThrow();
	});
});

describe('the docs engines', () => {
	test('run on the one theme, so every demo carries one theme id', () => {
		expect(docsReactFormEngine.getLayout().id).toBe(formEngine.getLayout().id);
	});
});
