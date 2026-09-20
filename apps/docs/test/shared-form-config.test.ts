import { describe, expect, test } from 'vitest';
import { docsReactFormEngine } from '../src/components/react-form-demo/demo-engine';
import { basicContactFormConfig } from '../src/lib/form-configs/basic-contact';
import { formEngine } from '../src/lib/form-engine-setup';

describe('shared docs form config', () => {
	test('is accepted by both renderer engines', () => {
		expect(() => formEngine.validateForm(basicContactFormConfig)).not.toThrow();
		expect(() => docsReactFormEngine.validateForm(basicContactFormConfig)).not.toThrow();
	});
});
