/**
 * Compile-time checks that createReactFormComposer().build() returns a typed FormEngine.
 * Run via: bun run check-types (tsconfig.test-types.json)
 */

import { createReactFormComposer } from '@/registries/builder-registry';
import type { FormEngine } from '@schema-engine/forms/engine';

import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { CardLayoutRegistration } from '@/components/layouts/card-layout.registration';
import { DefaultStepperRegistration } from '@/components/schema-engine/forms/steppers/default-stepper.registration';

type Assert<T extends true> = T;

const engine = createReactFormComposer()
	.addElement(InputElementRegistration)
	.addElement(TextareaElementRegistration)
	.addElement(CheckboxElementRegistration)
	.addLayout(CardLayoutRegistration)
	.addStepper(DefaultStepperRegistration)
	.build();

type _engineIsFormEngine = Assert<typeof engine extends FormEngine<any, any, any, any> ? true : false>;

const _typedEngine: FormEngine<any, any, any, any> = engine;

type _registeredElementIds = Assert<'input' extends FormEngine.ElementId ? true : false>;

type _registeredLayoutIds = Assert<'card' extends FormEngine.LayoutId ? true : false>;

type _registeredStepperIds = Assert<'default' extends FormEngine.StepperId ? true : false>;

type _inputConfig = FormEngine.GetElementConfig<'input'>;
type _inputHasInputType = Assert<'inputType' extends keyof _inputConfig ? true : false>;

const inputConfig = {
	$type: 'input',
	id: 'email',
	name: 'email',
	inputType: 'email',
} satisfies FormEngine.GetElementConfig<'input'>;

// @ts-expect-error -- unregistered element id is not in ElementId union
type _unknownElement = FormEngine.GetElementConfig<'not-registered'>;

void engine;
void _typedEngine;
void inputConfig;
