import { createContext } from '@ecopages/radiant/context';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';

export interface FormEngineContextValue {
	engine: CoreFormEngine;
}

export const formEngineContext = createContext<FormEngineContextValue>(Symbol.for('se-form-engine-context'));
