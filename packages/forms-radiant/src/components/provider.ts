import { createContext } from '@ecopages/radiant/context';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';

export interface FormEngineContextValue {
	/** Absent until the renderer has an engine to publish. */
	engine?: CoreFormEngine;
}

export const formEngineContext = createContext<FormEngineContextValue>(Symbol.for('se-form-engine-context'));
