import { useMemo } from 'react';
import type React from 'react';
import { isSubmissionBusy, type FormConfigView, type RecipeRegistration } from '@schema-engine/forms';
import { buildViewModel, createViewNavigation } from '@schema-engine/forms/recipes';
import { useFormContext } from '@/hooks/form-state';
import { useFormInstanceActions } from '@/hooks/use-form-context';
import { ViewProvider } from '@/contexts/view-context';
import type { ReactRecipeAdapterPayload } from '@/primitives';

type ReactRecipeRegistration = RecipeRegistration<string, RecipeRegistration['schema'], ReactRecipeAdapterPayload>;

function getRecipeAdapter(registration: ReactRecipeRegistration): ReactRecipeAdapterPayload {
	const payload = registration.render;
	if (!payload?.slots) {
		throw new Error(`Recipe '${registration.$type}' is missing a React render payload.`);
	}

	return payload;
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
	const { current, steps, next, back, goTo } = useFormInstanceActions();
	const isSubmitting = isSubmissionBusy(formState.submission.status);
	const viewContext = useMemo(
		() =>
			recipe
				? buildViewModel({
						config,
						kind: recipe.kind,
						states: steps,
						current,
						navigation: createViewNavigation(steps, current, { next, back, goTo }),
						isSubmitting,
						viewConfig: config.view as Record<string, unknown>,
					})
				: undefined,
		[recipe, config, steps, current, next, back, goTo, isSubmitting],
	);
	const adapter = recipe ? getRecipeAdapter(recipe as ReactRecipeRegistration) : undefined;
	/** @remarks Slot elements are built once per recipe so React skips a slot whose view context did not change. */
	const blocks = useMemo(
		() =>
			adapter && {
				header: renderSlotBlock(adapter.slots.header),
				progress: renderSlotBlock(adapter.slots.progress),
				actions: renderSlotBlock(adapter.slots.actions),
			},
		[adapter],
	);
	if (!adapter || !blocks || !viewContext) {
		return (
			<>
				{renderFields()}
				{children}
			</>
		);
	}

	const { viewConfig } = viewContext;

	const content = (
		<>
			{renderFields()}
			{children}
		</>
	);

	const slots = { ...blocks, content };

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
