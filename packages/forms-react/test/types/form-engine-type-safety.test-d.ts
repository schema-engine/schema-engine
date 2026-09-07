/**
 * Compile-time checks that createReactFormComposer().build() returns a typed FormEngine.
 * Run via: bun run check-types (tsconfig.test-types.json)
 */

import { createReactFormComposer } from '@/registries/builder-registry';
import type { FormEngine } from '@schema-engine/forms/engine';

import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';

type Assert<T extends true> = T;

const engine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addElement(CheckboxElementRegistration)
	.build();

type _engineIsFormEngine = Assert<typeof engine extends FormEngine<any, any, any> ? true : false>;

const _typedEngine: FormEngine<any, any, any> = engine;

type _registeredElementIds = Assert<'input' extends FormEngine.ElementId ? true : false>;

type _inputConfig = FormEngine.GetElementConfig<'input'>;
type _inputHasInputType = Assert<'inputType' extends keyof _inputConfig ? true : false>;

const inputConfig = {
	$type: 'input',
	id: 'email',
	name: 'email',
	inputType: 'email',
} satisfies FormEngine.GetElementConfig<'input'>;

engine.defineForm({
	id: 'contact',
	steps: [{ id: 'main', title: 'Contact', elements: [inputConfig] }],
});

// Unregistered `$type` rejection is asserted in `@schema-engine/forms` test/types/define-form.test-d.ts.

// @ts-expect-error -- unregistered element id is not in ElementId union
type _unknownElement = FormEngine.GetElementConfig<'not-registered'>;

void engine;
void _typedEngine;
void inputConfig;
