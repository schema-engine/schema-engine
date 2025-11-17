import { createContext, useContext } from 'react';

interface LayoutContextValue {
	step: {
		id: string;
		title?: string;
		description?: string;
		/**
		 * Step index (undefined for single-step forms where navigation is not meaningful)
		 */
		index?: number;
		/**
		 * Total number of steps (undefined for single-step forms where navigation is not meaningful)
		 */
		total?: number;
	};
	form: {
		id: string;
		title?: string;
		description?: string;
	};
	config: Record<string, any>;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children, value }: { children: React.ReactNode; value: LayoutContextValue }) {
	return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

/**
 * Hook to access layout context data
 * Use this in custom layout components to access step and form information
 *
 * @returns Layout context including:
 * - step: Current step information (id, title, description, index, total)
 * - form: Form metadata (id, title, description)
 * - config: Typed layout configuration
 *
 * @example
 * ```tsx
 * const { step, form, config } = useLayoutContext<CardLayoutConfig>();
 *
 * // Check if multi-step form using ternary operator
 * {typeof step.index === 'number' && typeof step.total === 'number' ? (
 *   <div>Step {step.index + 1} of {step.total}</div>
 * ) : null}
 * ```
 */
export function useLayoutContext<TConfig = Record<string, any>>() {
	const context = useContext(LayoutContext);
	if (!context) {
		throw new Error('useLayoutContext must be used within a LayoutProvider');
	}
	return {
		...context,
		config: context.config as TConfig,
	};
}
