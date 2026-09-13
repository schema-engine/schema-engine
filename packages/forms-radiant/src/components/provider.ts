import { createContext } from '@ecopages/radiant/context';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormAdapter } from '../adapters/types';

export interface FormEngineContextValue {
	engine: CoreFormEngine;
	adapter: FormAdapter;
}

export const formEngineContext = createContext<FormEngineContextValue>(Symbol.for('se-form-engine-context'));
