/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { defineFormRecipe, type FormShellLayout } from '@schema-engine/forms/recipes';
import { cardSpec, wizardSpec } from '@schema-engine/forms/recipes/built-in';
import { useActiveStep, useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';

type ShellProps = FormShellLayout<ReactNode>;

/**
 * Radiant-styled recipes for docs demos.
 *
 * @remarks
 * Binds the canonical recipe specs to small React shells and blocks that mirror
 * the `rui-*` classes from `@schema-engine/forms-radiant` (its stylesheet ships
 * with the docs shell), so React demos match the Radiant demos visually.
 */

function DemoCardShell({ slots, viewConfig }: ShellProps) {
	const padding = (((viewConfig.shell ?? {}) as Record<string, unknown>).padding as string | undefined) ?? 'lg';
	return (
		<div className="se-demo-shell">
			<div className="se-demo-shell__card">
				{slots.header ? (
					<div className={`se-demo-shell__header se-demo-shell__header--${padding}`}>{slots.header}</div>
				) : null}
				<div className="se-demo-shell__content">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}

function DemoStepHeader() {
	const { form } = useViewContext();
	const step = useActiveStep();
	const { showDescription = true, showStepCounter = false } = useViewConfig('header');
	const title = step.title || form.title;
	const description = step.description || form.description;
	const counter = showStepCounter ? `Step ${step.index + 1} of ${step.total}` : null;
	if (!title && !description && !counter) return null;
	return (
		<header className="se-demo-step-header">
			<h2 className="se-demo-step-header__title">{title}</h2>
			{showDescription && description ? <p className="se-demo-step-header__description">{description}</p> : null}
			{counter ? <p className="se-demo-step-header__counter">{counter}</p> : null}
		</header>
	);
}

function DemoStepIndicators() {
	const { steps } = useViewContext();
	return (
		<nav className="se-demo-indicators" aria-label="Form progress">
			<ol className="se-demo-indicators__list">
				{steps.map((step) => (
					<li
						key={step.id}
						className={
							step.isActive
								? 'se-demo-indicators__item se-demo-indicators__item--active'
								: 'se-demo-indicators__item'
						}
						data-active={step.isActive ? '' : undefined}
					>
						{step.isCompleted ? '✓' : step.index + 1}
					</li>
				))}
			</ol>
		</nav>
	);
}

/** @remarks Next and Submit carry distinct keys so React never turns Next into a submit button mid-click. */
function DemoWizardActions() {
	const { navigation, form } = useViewContext();
	return (
		<div className="se-demo-actions">
			<button
				type="button"
				className="rui-button rui-button--outline rui-button--md"
				onClick={navigation.goToPreviousStep}
				disabled={navigation.isFirstStep}
			>
				Previous
			</button>
			<div className="se-demo-actions__forward">
				{navigation.isLastStep ? (
					<button
						key="submit"
						type="submit"
						className="rui-button rui-button--filled rui-button--md"
						disabled={form.isSubmitting}
					>
						{form.isSubmitting ? 'Submitting…' : 'Submit'}
					</button>
				) : (
					<button
						key="next"
						type="button"
						className="rui-button rui-button--filled rui-button--md"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
					>
						Next
					</button>
				)}
			</div>
		</div>
	);
}

function DemoFormActions() {
	const { form } = useViewContext();
	return (
		<div className="se-demo-actions se-demo-actions--end">
			<button type="submit" className="rui-button rui-button--filled rui-button--md" disabled={form.isSubmitting}>
				{form.isSubmitting ? 'Submitting…' : 'Submit'}
			</button>
		</div>
	);
}

export const DemoCardRecipe = defineFormRecipe(cardSpec, {
	shell: DemoCardShell,
	slots: { header: DemoStepHeader, actions: DemoFormActions },
});

export const DemoWizardRecipe = defineFormRecipe(wizardSpec, {
	shell: DemoCardShell,
	slots: { header: DemoStepHeader, progress: DemoStepIndicators, actions: DemoWizardActions },
});

export const demoRecipeRegistrations = [DemoCardRecipe, DemoWizardRecipe] as const;
