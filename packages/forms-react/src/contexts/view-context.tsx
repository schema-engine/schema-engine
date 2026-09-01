import { createContext, useContext, type ReactNode } from 'react';
import type { RecipeSlot, ViewModel, ViewNavigation } from '@schema-engine/forms/recipes';
import { getSlotConfig } from '@schema-engine/forms/recipes';

export type { ViewModel as ViewContextValue, ViewNavigation, ViewStep } from '@schema-engine/forms/recipes';

const ViewContext = createContext<ViewModel | null>(null);

export function ViewProvider({ children, value }: { children: ReactNode; value: ViewModel }) {
	return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useViewContext(): ViewModel {
	const context = useContext(ViewContext);
	if (!context) {
		throw new Error('useViewContext must be used within a ViewProvider');
	}
	return context;
}

export function useOptionalViewContext(): ViewModel | null {
	return useContext(ViewContext);
}

export function useActiveStep() {
	return useViewContext().activeStep;
}

export function useFormNavigation(): ViewNavigation {
	return useViewContext().navigation;
}

export function useViewConfig<TConfig = Record<string, unknown>>(slot: RecipeSlot): TConfig {
	return getSlotConfig<TConfig>(useViewContext().viewConfig, slot);
}
