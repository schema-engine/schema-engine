/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { defineRecipeSpec, type FormShellLayout } from '@schema-engine/forms/recipes';
import {
	CardShellConfigSchema,
	StepHeaderConfigSchema,
	StepIndicatorsConfigSchema,
	cardSpec,
	formatStepLabel,
	wizardSpec,
} from '@schema-engine/forms/recipes/built-in';
import { useActiveStep, useViewConfig, useViewContext } from '@schema-engine/forms-react/hooks';
import { defineRecipe } from '@schema-engine/forms-react/primitives';

type ShellProps = FormShellLayout<ReactNode>;

/**
 * Radiant-styled recipes for docs demos.
 *
 * @remarks
 * Binds the canonical recipe specs to small React shells and blocks that mirror
 * the `rui-*` classes from `@schema-engine/forms-radiant` (its stylesheet ships
 * with the docs shell), so React demos match the Radiant demos visually.
 */

function DemoCardShell({ slots }: ShellProps) {
	return (
		<div className="se-demo-shell">
			<div className="se-demo-shell__card">
				{slots.header ? (
					<div className={'se-demo-shell__header se-demo-shell__header--lg'}>{slots.header}</div>
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
	const { showDescription, showStepCounter, labels } = useViewConfig('header', StepHeaderConfigSchema);
	const title = step.title || form.title;
	const description = step.description || form.description;
	const counter = showStepCounter ? formatStepLabel(labels.stepCounter, step.index + 1, step.total) : null;
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
	const { labels } = useViewConfig('progress', StepIndicatorsConfigSchema);
	return (
		<nav className="se-demo-indicators" aria-label={labels.regionAriaLabel}>
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
						{step.isCompleted ? (
							<>
								<span aria-hidden>✓</span>
								<span className="sr-only">
									{formatStepLabel(labels.completed, step.index + 1, steps.length)}
								</span>
							</>
						) : (
							step.index + 1
						)}
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

const demoCardSpec = defineRecipeSpec({
	$type: cardSpec.$type,
	kind: cardSpec.kind,
	metadata: cardSpec.metadata,
	slotSchemas: cardSpec.slotSchemas,
	slotDefaults: cardSpec.slotDefaults,
	appearanceAxes: cardSpec.appearanceAxes,
});

const demoWizardSpec = defineRecipeSpec({
	$type: wizardSpec.$type,
	kind: wizardSpec.kind,
	metadata: wizardSpec.metadata,
	slotSchemas: { ...wizardSpec.slotSchemas, shell: CardShellConfigSchema },
	slotDefaults: wizardSpec.slotDefaults,
	appearanceAxes: { shell: ['size', 'surface'] },
});

export const DemoCardRecipe = defineRecipe(demoCardSpec, {
	shell: DemoCardShell,
	slots: { header: DemoStepHeader, actions: DemoFormActions },
});

export const DemoWizardRecipe = defineRecipe(demoWizardSpec, {
	shell: DemoCardShell,
	slots: { header: DemoStepHeader, progress: DemoStepIndicators, actions: DemoWizardActions },
});

export const demoRecipeRegistrations = [DemoCardRecipe, DemoWizardRecipe] as const;
