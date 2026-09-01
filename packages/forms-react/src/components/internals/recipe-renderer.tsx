import type React from 'react';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { applySlotDefaults, buildViewModel, type RecipeKind, type ViewNavigation } from '@schema-engine/forms/recipes';
import { resolveFormRecipe, type RecipeRegistration } from '@schema-engine/forms';
import { useFormContext } from '@/adapters/context';
import { useOptionalFormEngine, useFormInstanceActions } from '@/hooks/use-form-context';
import { ViewProvider } from '@/contexts/view-context';
import type { ReactRecipeAdapterPayload } from '@/recipes/types';

import './recipe-renderer.css';

function createInitialStepStates(config: FormConfig) {
	return {
		completed: config.steps.map(() => false),
		valid: config.steps.map(() => false),
		visited: config.steps.map((_, index) => index === 0),
	};
}

function getRecipeAdapter(registration: RecipeRegistration<any, any, ReactRecipeAdapterPayload>): {
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
	config: FormConfig;
	children?: React.ReactNode;
	renderFields: () => React.ReactNode;
}

export function RecipeRenderer({ config, children, renderFields }: RecipeRendererProps) {
	const engineContext = useOptionalFormEngine();
	const { formState } = useFormContext();
	const { stepStates, currentStep, navigation } = useFormInstanceActions();
	const recipe = resolveFormRecipe(config, engineContext ? (id) => engineContext.engine.getRecipe(id) : undefined);
	if (!recipe) {
		return (
			<>
				{renderFields()}
				{children}
			</>
		);
	}

	const { adapter, kind } = getRecipeAdapter(recipe as RecipeRegistration<any, any, ReactRecipeAdapterPayload>);
	const viewConfig = applySlotDefaults(
		(config.view ?? { $type: recipe.$type }) as Record<string, unknown>,
		recipe.slotDefaults,
	);

	const navigationControls: ViewNavigation = {
		canGoNext: navigation.canGoNext,
		canGoPrevious: navigation.canGoPrevious,
		isFirstStep: currentStep === 0,
		isLastStep: currentStep === config.steps.length - 1,
		goToStep: navigation.goToStep,
		goToNextStep: navigation.goToNextStep,
		goToPreviousStep: navigation.goToPreviousStep,
	};

	const viewContext = buildViewModel({
		config,
		kind,
		currentStepIndex: currentStep,
		navigation: navigationControls,
		isSubmitting: formState.isSubmitting,
		viewConfig,
		stepStates: stepStates ?? createInitialStepStates(config),
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
