import { useMemo, type ReactNode } from 'react';
import type { EngineOutputMaps, FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { FormEngineContext, createFormEngineContextValue } from './provider';

export interface FormEngineProviderProps<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
> {
	children: ReactNode;
	engine: CoreFormEngine<TElements, TRecipes, TActions, TOutputs>;
	/**
	 * Turns an issue into the text a field shows, for every form under the provider.
	 *
	 * @remarks
	 * The one seam to the application's language: the engine reports what is wrong (`type`, `ruleId`,
	 * `params`) and this says it, usually with the application's translation function. A form can set its
	 * own on `FormRenderer` or `FormProvider`. Without one an issue shows its own `message`, the text the
	 * author wrote on the rule or a server or control sent, and shows nothing when it has none. The rule
	 * type is never shown.
	 */
	formatIssue?: FormIssueFormatter;
}

export function FormEngineProvider<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
>({ children, engine, formatIssue }: FormEngineProviderProps<TElements, TRecipes, TActions, TOutputs>) {
	const value = useMemo(() => createFormEngineContextValue(engine, formatIssue), [engine, formatIssue]);

	if (!engine) {
		throw new Error('FormEngineProvider requires a FormEngine instance. Create one using createFormEngine()');
	}

	return <FormEngineContext.Provider value={value}>{children}</FormEngineContext.Provider>;
}
