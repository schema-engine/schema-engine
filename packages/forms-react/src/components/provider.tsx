import { createContext } from 'react';
import type { EngineOutputMaps, FormEngineRuntime as FormEngine } from '@schema-engine/forms';

/**
 * Form Engine context value
 */
export interface FormEngineContextValue<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	engine: FormEngine<TElements, TRecipes, TActions, TOutputs>;
}

/**
 * Erases registration maps for context storage.
 *
 * @remarks `useFormEngine` reapplies the consumer's maps after reading context.
 */
export function createFormEngineContextValue<
	TElements extends Record<string, unknown>,
	TRecipes extends Record<string, unknown>,
	TActions extends Record<string, unknown>,
	TOutputs extends EngineOutputMaps,
>(engine: FormEngine<TElements, TRecipes, TActions, TOutputs>): FormEngineContextValue {
	return { engine: engine as unknown as FormEngineContextValue['engine'] };
}

/**
 * Form Engine context
 * Provides access to the FormEngine instance
 */
export const FormEngineContext = createContext<FormEngineContextValue | null>(null);
