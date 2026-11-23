import { createContext } from '@ecopages/radiant/context';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import type { FormEngineRuntime as CoreFormEngine } from '@schema-engine/forms';

export interface FormEngineContextValue {
	/** Absent until the renderer has an engine to publish. */
	engine?: CoreFormEngine;
	/** The renderer's own issue formatter, which a form below it uses over the engine's. */
	formatIssue?: FormIssueFormatter;
}

export const formEngineContext = createContext<FormEngineContextValue>(Symbol.for('se-form-engine-context'));
