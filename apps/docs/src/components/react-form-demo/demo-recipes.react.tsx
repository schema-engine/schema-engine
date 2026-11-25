/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig, type FormShellLayout } from '@schema-engine/forms/recipes';
import {
	CardShellConfigSchema,
	FormActionsConfigSchema,
	StepHeaderConfigSchema,
	StepIndicatorsConfigSchema,
	WizardActionsConfigSchema,
	cardSpec,
	formatStepLabel,
	wizardSpec,
} from '@schema-engine/forms/recipes/built-in';
import { useActiveStep, useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { defineRecipe } from '@schema-engine/forms-react/primitives';

type ShellProps = FormShellLayout<ReactNode>;

/**
 * Recipes for the docs demos, drawn like the Radiant ones.
 *
 * @remarks
 * Binds the canonical recipe specs, unchanged, to small React shells and blocks that read the same slot config as the
 * Radiant blocks of `@schema-engine/forms-radiant`: labels, sizes, alignment and the step counter come from the
 * config, so both renderers draw the same design from the same document. The shells, step header, step indicators
 * and actions are styled by the kit's own `se-demo-*` classes in `demo-recipes.css`, and the buttons keep Radiant
 * UI's `rui-*` classes, so the demos depend on no class name of `@schema-engine/forms-radiant`.
 */

function DemoCardShell({ slots, viewConfig }: ShellProps) {
	const { appearance } = getSlotConfig(viewConfig, 'shell', CardShellConfigSchema);
	return (
		<div className="se-demo-card">
			<div className="se-demo-card__card" {...getAppearanceAttributes(appearance)}>
				{slots.header ? <div className="se-demo-card__header se-demo-card__section">{slots.header}</div> : null}
				<div className="se-demo-card__content se-demo-card__section">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}

/** @remarks The wizard binds `wizardSpec`, which declares no shell, so this stack is the kit's own, in Radiant's slot order. */
function DemoStackShell({ slots }: ShellProps) {
	return (
		<div className="se-demo-stack">
			{slots.header ? <div className="se-demo-stack__header">{slots.header}</div> : null}
			{slots.progress ? <div className="se-demo-stack__progress">{slots.progress}</div> : null}
			<div className="se-demo-stack__content">{slots.content}</div>
			{slots.actions ? <div className="se-demo-stack__actions">{slots.actions}</div> : null}
		</div>
	);
}

function DemoStepHeader() {
	const { form } = useViewContext();
	const step = useActiveStep();
	const { showDescription, showStepCounter, labels, size, align, titleAs, counterPlacement, fallbackToFormTitle } =
		useViewConfig('header', StepHeaderConfigSchema);
	const Title = titleAs;
	const title = step.title || (fallbackToFormTitle ? form.title : undefined);
	const description = step.description || form.description;
	const counter = showStepCounter ? formatStepLabel(labels.stepCounter, step.index + 1, step.total) : null;
	if (!title && !description && !counter) return null;
	return (
		<header className="se-demo-step-header" data-size={size} data-align={align}>
			{counter && counterPlacement === 'before' ? (
				<p className="se-demo-step-header__counter">{counter}</p>
			) : null}
			{title ? <Title className="se-demo-step-header__title">{title}</Title> : null}
			{showDescription && description ? <p className="se-demo-step-header__description">{description}</p> : null}
			{counter && counterPlacement === 'after' ? <p className="se-demo-step-header__counter">{counter}</p> : null}
		</header>
	);
}

function DemoStepIndicators() {
	const { steps, navigation } = useViewContext();
	const { labels, showStepNumbers, showStepTitles, showStepDescriptions } = useViewConfig(
		'progress',
		StepIndicatorsConfigSchema,
	);
	return (
		<nav className="se-demo-indicators" aria-label={labels.regionAriaLabel}>
			<ol className="se-demo-indicators__list">
				{steps.map((step) => (
					<li key={step.id} className="se-demo-indicators__item">
						<button
							type="button"
							className="rui-button rui-button--ghost rui-button--md se-demo-indicators__button"
							onClick={() => navigation.goToStep(step.id)}
							disabled={!step.isActive && !navigation.canGoToStep(step.id)}
							aria-current={step.isActive ? 'step' : undefined}
							data-active={step.isActive}
							data-completed={step.isCompleted}
						>
							{showStepNumbers ? (
								<span className="se-demo-indicators__number">
									{step.isCompleted ? <span aria-hidden="true">✓</span> : step.index + 1}
								</span>
							) : null}
							{showStepTitles || (showStepDescriptions && step.description) ? (
								<span className="se-demo-indicators__copy">
									{showStepTitles ? (
										<span className="se-demo-indicators__title">
											{step.title ||
												formatStepLabel(labels.untitledStep, step.index + 1, step.total)}
										</span>
									) : null}
									{showStepDescriptions && step.description ? (
										<small>{step.description}</small>
									) : null}
								</span>
							) : null}
							{step.isCompleted ? (
								<span className="sr-only">
									{formatStepLabel(labels.completed, step.index + 1, step.total)}
								</span>
							) : null}
						</button>
					</li>
				))}
			</ol>
		</nav>
	);
}

/** @remarks Next and Submit carry distinct keys so React never turns Next into a submit button mid-click. */
function DemoWizardActions() {
	const { navigation, form } = useViewContext();
	const step = useActiveStep();
	const { labels, variant, showStepCounter } = useViewConfig('actions', WizardActionsConfigSchema);
	return (
		<div className="se-demo-actions">
			<button
				type="button"
				className={`rui-button rui-button--${variant === 'minimal' ? 'ghost' : 'outline'} rui-button--md`}
				onClick={navigation.goToPreviousStep}
				disabled={navigation.isFirstStep}
				aria-label={labels.previousAriaLabel}
			>
				{labels.previous}
			</button>
			{showStepCounter ? (
				<span className="se-demo-actions__counter" aria-live="polite">
					{formatStepLabel(labels.stepCounter, step.index + 1, step.total)}
				</span>
			) : null}
			<div className="se-demo-actions__forward">
				{navigation.isLastStep ? (
					<button
						key="submit"
						type="submit"
						className="rui-button rui-button--filled rui-button--md"
						disabled={form.isSubmitting}
						aria-label={labels.submitAriaLabel}
					>
						{form.isSubmitting ? labels.submitting : labels.submit}
					</button>
				) : (
					<button
						key="next"
						type="button"
						className="rui-button rui-button--filled rui-button--md"
						onClick={navigation.goToNextStep}
						disabled={!navigation.canGoNext}
						aria-label={labels.nextAriaLabel}
					>
						{labels.next}
					</button>
				)}
			</div>
		</div>
	);
}

function DemoFormActions() {
	const { form } = useViewContext();
	const { labels, align } = useViewConfig('actions', FormActionsConfigSchema);
	return (
		<div className={`se-demo-actions se-demo-actions--${align}`}>
			<button
				type="submit"
				className="rui-button rui-button--filled rui-button--md"
				disabled={form.isSubmitting}
				aria-label={labels.submitAriaLabel}
			>
				{form.isSubmitting ? labels.submitting : labels.submit}
			</button>
		</div>
	);
}

export const DemoCardRecipe = defineRecipe(cardSpec, {
	shell: DemoCardShell,
	slots: { header: DemoStepHeader, actions: DemoFormActions },
});

export const DemoWizardRecipe = defineRecipe(wizardSpec, {
	shell: DemoStackShell,
	slots: { header: DemoStepHeader, progress: DemoStepIndicators, actions: DemoWizardActions },
});

export const demoRecipeRegistrations = [DemoCardRecipe, DemoWizardRecipe] as const;
