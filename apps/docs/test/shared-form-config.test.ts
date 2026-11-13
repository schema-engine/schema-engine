import { describe, expect, test } from 'vitest';
import { docsReactFormEngine } from '../src/components/react-form-demo/demo-engine';
import { basicContactFormConfig } from '../src/lib/form-configs/basic-contact';
import { validationDemoConfig } from '../src/lib/form-configs/react-examples';
import { formEngine } from '../src/lib/form-engine-setup';

describe('shared docs form config', () => {
	test('is accepted by both renderer engines', () => {
		expect(() => formEngine.validateForm(basicContactFormConfig)).not.toThrow();
		expect(() => docsReactFormEngine.validateForm(basicContactFormConfig)).not.toThrow();
	});

	test('the React examples validation config is accepted by both renderer engines', () => {
		expect(() => formEngine.validateForm(validationDemoConfig)).not.toThrow();
		expect(() => docsReactFormEngine.validateForm(validationDemoConfig)).not.toThrow();
	});
});
