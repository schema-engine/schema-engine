import { createContext } from '@ecopages/radiant/context';

export interface LayoutContextValue {
	step: {
		id: string;
		title?: string;
		description?: string;
		index?: number;
		total?: number;
	};
	form: {
		id: string;
		title?: string;
		description?: string;
	};
	config: Record<string, unknown>;
}

export const layoutContext = createContext<LayoutContextValue>(Symbol.for('se-layout-context'));
