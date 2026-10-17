import type React from 'react';
import { type FormConfigView, type RecipeRegistration } from '@schema-engine/forms';
import { applySlotDefaults, buildViewModel, type RecipeKind } from '@schema-engine/forms/recipes';
import { useFormContext } from '@/adapters/context';
import { useFormInstanceActions } from '@/hooks/use-form-context';
import { ViewProvider } from '@/contexts/view-context';
import type { ReactRecipeAdapterPayload } from '@/primitives';

type ReactRecipeRegistration = RecipeRegistration<string, RecipeRegistration['schema'], ReactRecipeAdapterPayload>;

function getRecipeAdapter(registration: ReactRecipeRegistration): {
	adapter: ReactRecipeAdapterPayload;
	kind: RecipeKind;
} {
	const payload = registration.render;
	if (!payload?.slots) {
		throw new Error(`Recipe '${registration.$type}' is missing a React render payload.`);
	}

	return { adapter: payload, kind: registration.kind };
}

function renderSlotBlock(Component: React.FC | undefined): React.ReactNode {
	if (!Component) return null;
	return <Component />;
}

interface RecipeRendererProps {
	config: FormConfigView;
	recipe: RecipeRegistration | undefined;
	children?: React.ReactNode;
	renderFields: () => React.ReactNode;
}

export function RecipeRenderer({ config, recipe, children, renderFields }: RecipeRendererProps) {
	const { formState } = useFormContext();
	const { stepStates, currentStep, navigation } = useFormInstanceActions();
	if (!recipe) {
		return (
			<>
				{renderFields()}
				{children}
			</>
		);
	}

	const { adapter, kind } = getRecipeAdapter(recipe as ReactRecipeRegistration);
	const viewConfig = applySlotDefaults(
		(config.view ?? { $type: recipe.$type }) as Record<string, unknown>,
		recipe.slotDefaults,
	);

	const viewContext = buildViewModel({
		config,
		kind,
		currentStepIndex: currentStep,
		navigation,
		isSubmitting: formState.isSubmitting,
		viewConfig,
		stepStates,
	});

	const content = (
		<>
			{renderFields()}
			{children}
		</>
	);

	const slots = {
		header: renderSlotBlock(adapter.slots.header),
		progress: renderSlotBlock(adapter.slots.progress),
		content,
		actions: renderSlotBlock(adapter.slots.actions),
	};

	const Shell = adapter.shell;
	if (!Shell) {
		return (
			<ViewProvider value={viewContext}>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions}
			</ViewProvider>
		);
	}

	return (
		<ViewProvider value={viewContext}>
			<Shell slots={slots} viewConfig={viewConfig} />
		</ViewProvider>
	);
}
