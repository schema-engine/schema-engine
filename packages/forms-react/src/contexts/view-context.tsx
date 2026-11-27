import { createContext, useContext, type ReactNode } from 'react';
import type { StandardSchemaV1 } from '@standard-schema/spec';
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

/** Reads the complete config of one slot, typed by the slot schema's output. */
export function useViewConfig<TSchema extends StandardSchemaV1>(
	slot: RecipeSlot,
	schema: TSchema,
): StandardSchemaV1.InferOutput<TSchema> {
	return getSlotConfig(useViewContext().viewConfig, slot, schema);
}
