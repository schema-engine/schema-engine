/**
 * Compile-time checks that createFormEngine() returns a typed FormEngine.
 * Run via: bun run check-types (tsconfig.test-types.json)
 */

import { createFormEngine } from '@schema-engine/forms';
import type { FormEngine, FormEngineRuntime } from '@schema-engine/forms/engine';
import type { GetElementConfig } from '@schema-engine/forms/schemas';

import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { TextareaElementRegistration } from '@/components/schema-engine/forms/inputs/form-textarea.registration';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';

type Assert<T extends true> = T;

const engine = createFormEngine({
	elements: [InputElementRegistration, TextareaElementRegistration, CheckboxElementRegistration],
});

type EngineElementMap<TEngine> =
	TEngine extends FormEngine<infer TElements, infer _TRecipes, infer _TActions, infer _Outputs> ? TElements : never;

type _engineIsFormEngine = Assert<typeof engine extends FormEngineRuntime ? true : false>;
type _registeredElementIds = Assert<'input' extends keyof EngineElementMap<typeof engine> ? true : false>;

type _inputConfig = GetElementConfig<'input', EngineElementMap<typeof engine>>;
type _inputHasInputType = Assert<'inputType' extends keyof _inputConfig ? true : false>;
type _inputTypeDefaultsToText = Assert<undefined extends _inputConfig['inputType'] ? true : false>;

const inputConfig = {
	$type: 'input',
	id: 'email',
	name: 'email',
} satisfies _inputConfig;

engine.defineForm({
	id: 'contact',
	steps: [{ id: 'main', title: 'Contact', elements: [inputConfig] }],
});

// Unregistered `$type` rejection is asserted in `@schema-engine/forms` test/types/define-form.test-d.ts.

// @ts-expect-error -- unregistered element id is not in this engine's element map
type _unknownElement = GetElementConfig<'not-registered', EngineElementMap<typeof engine>>;

void engine;
void inputConfig;

import type { FormRendererProps } from '@/components/internals/form-renderer';
import { FormEngineContext } from '@/components/provider';
import type { FormEngineContextValue } from '@/components/provider';
import type { FormProviderProps } from '@/hooks/form-state/types';
import type { ComponentProps } from 'react';
import { defineInput } from '@schema-engine/forms/types';
import * as z from 'zod/mini';
import { anyValue } from '../utils/any-value';

const transformedElement = defineInput({
	value: anyValue,
	$type: 'transformed',
	schema: z.object({
		$type: z.literal('transformed'),
		name: z.string(),
		count: z._default(z.pipe(z.string(), z.transform(Number)), 0),
	}),
	metadata: { name: 'Transformed', category: 'input' },
	render: (config) => {
		const count: number = config.count;
		return count;
	},
});
const transformedAction = {
	$type: 'count' as const,
	schema: z.object({
		$type: z.literal('count'),
		id: z.string(),
		count: z._default(z.pipe(z.string(), z.transform(Number)), 0),
	}),
	metadata: { name: 'Count' },
	execute: async () => ({ success: true }),
};
const transformedEngine = createFormEngine({ elements: [transformedElement], actions: [transformedAction] });
const transformedForm = transformedEngine.defineForm({
	id: 'transformed',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'transformed', name: 'count', count: '1' }] }],
});
type TransformedProvider =
	typeof transformedEngine extends FormEngine<infer _E, infer _R, infer _A, infer O> ? FormProviderProps<O> : never;
type TransformedRenderer =
	typeof transformedEngine extends FormEngine<infer E, infer R, infer A, infer O>
		? FormRendererProps<E, R, A, O>
		: never;
const transformedRenderer: TransformedRenderer = { engine: transformedEngine, config: transformedForm };
const transformedProvider: TransformedProvider = {
	config: transformedForm,
	children: null,
	onAction: (action) => {
		const count: number = action.count;
		void count;
	},
};
void transformedRenderer;
void transformedProvider;

type FormEngineContextStorage = NonNullable<ComponentProps<typeof FormEngineContext.Provider>['value']>;

const validEngineContext: FormEngineContextStorage = { engine };
const invalidEngineContext: FormEngineContextStorage = {
	// @ts-expect-error -- the engine context requires a FormEngine runtime
	engine: {},
};
type PartialEngineRuntime = Pick<
	FormEngineContextValue['engine'],
	'getElement' | 'getRecipe' | 'getValidationRegistry' | 'getLayout'
>;
declare const partialEngine: PartialEngineRuntime;
const incompleteEngineContext: FormEngineContextStorage = {
	// @ts-expect-error -- the engine context requires the complete runtime
	engine: partialEngine,
};
void validEngineContext;
void invalidEngineContext;
void incompleteEngineContext;
