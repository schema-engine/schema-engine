import { afterEach, describe, expect, test, vi } from 'vitest';
import type { RuiFormElement } from '@ecopages/radiant-ui/form';
import '@ecopages/radiant-ui/form';
import '@ecopages/radiant-ui/field';
import { createFormStateContainer, type NativeValidity } from '@schema-engine/forms/state-container';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import {
	createNativeControl,
	nativeFactCases,
	putControlInState,
	type NativeFactCase,
} from '../../../../test-utils/native-fact-cases';

/**
 * The facts the real `rui-form` of Radiant UI reports to the engine container, for the control states
 * `@schema-engine/forms-react` is held to in `native-control.browser.test.tsx`.
 *
 * @remarks
 * Radiant UI owns the mapping from `ValidityState` to a fact, so this file is where the shared table is checked
 * against the renderer that defines it.
 */
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
const config = engine.validateForm({
	id: 'facts',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'input', id: 'field', name: 'field' }] }],
});

const cleanups: Array<() => void> = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

/**
 * Mounts the control in a `rui-field` of a `rui-form` over a container and returns the last fact the form reported for it on a submit.
 *
 * @remarks The calls made while the control was put in state are cleared before the submit, so the wait is for the report the submit makes. A field the form never reports fails the wait.
 */
async function reportedFact(spec: NativeFactCase) {
	const container = createFormStateContainer({
		config: { steps: config.steps, validationMode: 'onSubmit', reValidateMode: 'onChange' },
		registry: engine.getValidationRegistry(),
		defaults: { field: '' },
	});
	const reported = vi.spyOn(container, 'reportNative');
	const form = document.createElement('rui-form') as RuiFormElement;
	const nativeForm = document.createElement('form');
	nativeForm.setAttribute('data-ref', 'form');
	nativeForm.noValidate = true;
	const field = document.createElement('rui-field');
	field.setAttribute('name', 'field');
	const control = createNativeControl(spec);
	control.setAttribute('data-rui-control', '');
	field.append(control);
	nativeForm.append(field);
	form.append(nativeForm);
	document.body.append(form);
	cleanups.push(() => form.remove());
	await customElements.whenDefined('rui-form');
	await customElements.whenDefined('rui-field');
	cleanups.push(form.connect(container, { submitHandler: () => undefined }));
	await putControlInState(control, spec);
	reported.mockClear();
	nativeForm.requestSubmit();
	const reportsField = () => reported.mock.calls.filter(([call]) => 'field' in call);
	await vi.waitFor(() => expect(reportsField()).not.toHaveLength(0));
	return { control, fact: reportsField().at(-1)?.[0]['field'] as NativeValidity | null };
}

describe('the fact rui-form reports for a control', () => {
	test.each(nativeFactCases.map((spec) => [spec.name, spec] as const))('%s', async (_name, spec) => {
		const { control, fact } = await reportedFact(spec);

		if (spec.fact === null) {
			expect(fact).toBeNull();
			return;
		}
		expect(fact).toEqual({
			...spec.fact,
			...(control.validationMessage && { message: control.validationMessage }),
		});
	});
});
