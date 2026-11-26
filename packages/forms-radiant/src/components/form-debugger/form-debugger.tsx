import { FormController } from '@/adapters/radiant/controller';
import './form-debugger.css';
import { customElement, prop, RadiantElement, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import type { JSX_PROPS } from '@ecopages/jsx';
import { RuiBadge } from '@ecopages/radiant-ui/badge';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveFormSteps, deriveNavigation, type FormMeta } from '@/lib/instance-view';
import { isSubmissionBusy } from '@schema-engine/forms';
import type { ViewNavigation, ViewStep } from '@schema-engine/forms/recipes';
import type { FormStateSnapshot } from '@schema-engine/forms/state-container';

function BugIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
			<path d="m8 6 4-4 4 4" />
			<path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
			<path d="m20 22-5-5" />
		</svg>
	);
}

function CloseIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	);
}

function DebuggerToggle({ onOpen }: { onOpen: () => void }) {
	return (
		<div class="se-form-debugger se-form-debugger--collapsed">
			<RuiButton
				type="button"
				variant="filled"
				size="lg"
				square
				class="se-form-debugger__toggle"
				on:click={onOpen}
				aria={{ label: 'Open form debugger' }}
			>
				<BugIcon />
			</RuiButton>
		</div>
	);
}

function DebuggerHeader({
	title,
	currentStep,
	totalSteps,
	onClose,
}: {
	onClose: () => void;
	title: string;
	currentStep: number;
	totalSteps: number;
}) {
	return (
		<header class="se-form-debugger__header">
			<div>
				<h3 class="se-form-debugger__title">{title}</h3>
				{totalSteps > 1 ? (
					<span class="se-form-debugger__subtitle">
						Step {currentStep + 1} / {totalSteps}
					</span>
				) : null}
			</div>
			<RuiButton
				type="button"
				variant="ghost"
				size="sm"
				square
				class="se-form-debugger__close-button"
				on:click={onClose}
				aria={{ label: 'Close debugger' }}
			>
				<CloseIcon />
			</RuiButton>
		</header>
	);
}

function DebuggerProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
	return (
		<section>
			<p class="se-form-debugger__section-title">Progress</p>
			<progress class="se-form-debugger__progress" max={100} value={((currentStep + 1) / totalSteps) * 100} />
		</section>
	);
}

function DebuggerSteps({
	steps,
	currentStep,
	showDetails,
}: {
	steps: ViewStep[];
	currentStep: number;
	showDetails: boolean;
}) {
	return (
		<section>
			<p class="se-form-debugger__section-title">Steps</p>
			<div class="se-form-debugger__timeline">
				{steps.map((step, index) => (
					<div class="se-form-debugger__timeline-item" data={{ active: index === currentStep }}>
						<div>
							<div class="se-form-debugger__step-title">{step.title ?? `Step ${index + 1}`}</div>
							{showDetails && step.description ? (
								<div class="se-form-debugger__step-description">{step.description}</div>
							) : null}
							<div class="se-form-debugger__timeline-meta">
								{step.isVisited && !step.isInvalid ? (
									<RuiBadge
										variant="filled"
										class="se-form-debugger__badge se-form-debugger__badge--valid"
									>
										Valid
									</RuiBadge>
								) : null}
								{step.isInvalid ? (
									<RuiBadge
										variant="filled"
										class="se-form-debugger__badge se-form-debugger__badge--invalid"
									>
										Invalid
									</RuiBadge>
								) : null}
								{step.isVisited ? (
									<RuiBadge variant="muted" class="se-form-debugger__badge">
										Visited
									</RuiBadge>
								) : null}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function DebuggerFormState({
	formState,
	isSubmitting,
	invalidSteps,
}: {
	formState: FormStateSnapshot | undefined;
	isSubmitting: boolean;
	invalidSteps: string[] | undefined;
}) {
	return (
		<section>
			<p class="se-form-debugger__section-title">Form state</p>
			<div class="se-form-debugger__details">
				<div class="se-form-debugger__row">
					<span class="se-form-debugger__detail-label">Submitting</span>
					<code class="se-form-debugger__detail-value">{String(isSubmitting)}</code>
				</div>
				<div class="se-form-debugger__row">
					<span class="se-form-debugger__detail-label">Valid</span>
					<code class="se-form-debugger__detail-value">{String(formState?.isValid ?? true)}</code>
				</div>
				{invalidSteps ? (
					<div class="se-form-debugger__row">
						<span class="se-form-debugger__detail-label">Invalid steps</span>
						<code class="se-form-debugger__detail-value">{JSON.stringify(invalidSteps)}</code>
					</div>
				) : null}
			</div>
			<pre class="se-form-debugger__pre">{JSON.stringify(formState?.values ?? {}, null, 2)}</pre>
			{Object.keys(formState?.errors ?? {}).length ? (
				<pre class="se-form-debugger__pre">{JSON.stringify(formState?.errors, null, 2)}</pre>
			) : null}
		</section>
	);
}

function DebuggerNav({
	steps,
	currentStep,
	navigation,
	onPrevious,
	onNext,
	onGoTo,
}: {
	onPrevious: () => void;
	onNext: () => void;
	onGoTo: (id: string) => void;
	steps: ViewStep[];
	currentStep: number;
	navigation: ViewNavigation;
}) {
	return (
		<footer class="se-form-debugger__nav">
			<RuiButton
				type="button"
				variant="outline"
				size="sm"
				on:click={onPrevious}
				disabled={navigation.isFirstStep}
			>
				Previous
			</RuiButton>
			<div class="se-form-debugger__nav-dots">
				{steps.map((step, index) => (
					<button
						type="button"
						class="se-form-debugger__nav-dot"
						data={{
							active: index === currentStep,
							completed: index < currentStep,
						}}
						on:click={() => onGoTo(step.id)}
						disabled={index !== currentStep && !navigation.canGoToStep(step.id)}
						aria-label={`Go to ${step.title ?? `step ${index + 1}`}`}
					/>
				))}
			</div>
			<RuiButton type="button" variant="outline" size="sm" on:click={onNext} disabled={!navigation.canGoNext}>
				Next
			</RuiButton>
		</footer>
	);
}

export interface FormDebuggerProps {
	defaultOpen?: boolean;
	showStepDetails?: boolean;
	showFormState?: boolean;
}

/** Opt-in floating inspector for values, errors, and multi-step progress. */
@customElement('se-form-debugger')
export class FormDebuggerElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: FormDebuggerProps;

	@prop({ type: Boolean, defaultValue: false }) defaultOpen = false;
	@prop({ type: Boolean, defaultValue: true }) showStepDetails = true;
	@prop({ type: Boolean, defaultValue: true }) showFormState = true;

	@state protected open = false;

	private readonly form = new FormController(this);
	private readonly formState = this.form.select((snapshot) => snapshot);
	private readonly wizard = this.form.wizard;
	private readonly submission = this.form.submission;
	private stopWatching: Array<() => void> = [];

	@contextSelector({
		context: formInstanceContext,
		select: (instance: FormInstanceContextValue | undefined) => instance?.meta,
	})
	private meta?: FormMeta;

	protected override onConnected(): void {
		this.open = this.defaultOpen;
		const update = (): void => this.requestUpdate();
		this.stopWatching = [
			this.formState.subscribe(update),
			this.wizard.subscribe(update),
			this.submission.subscribe(update),
		];
	}

	override disconnectedCallback(): void {
		for (const stop of this.stopWatching) stop();
		this.stopWatching = [];
		super.disconnectedCallback();
	}

	private readonly openPanel = (): void => {
		this.open = true;
	};

	private readonly closePanel = (): void => {
		this.open = false;
	};

	private readonly goPrevious = (): void => {
		void this.wizard.get()?.back();
	};

	private readonly goNext = (): void => {
		void this.wizard.get()?.next();
	};

	private readonly goToStep = (id: string): void => {
		void this.wizard.get()?.goTo(id);
	};

	override render() {
		if (!this.open) {
			return <DebuggerToggle onOpen={this.openPanel} />;
		}

		const formState = this.formState.get();
		const submission = this.submission.get();
		const { meta } = this;
		const wizard = this.wizard.get();
		const steps = meta && wizard ? deriveFormSteps(meta, wizard) : [];
		const navigation = meta && wizard ? deriveNavigation(meta, wizard) : undefined;
		const currentStep = Math.max(
			steps.findIndex(({ isActive }) => isActive),
			0,
		);
		const isMultiStep = steps.length > 1;

		return (
			<div class="se-form-debugger se-form-debugger--expanded">
				<section class="se-form-debugger__panel" aria={{ label: 'Form debugger' }}>
					<DebuggerHeader
						title={meta?.title ?? 'Form Debugger'}
						currentStep={currentStep}
						totalSteps={steps.length}
						onClose={this.closePanel}
					/>
					<div class="se-form-debugger__content">
						{isMultiStep ? <DebuggerProgress currentStep={currentStep} totalSteps={steps.length} /> : null}
						{isMultiStep ? (
							<DebuggerSteps steps={steps} currentStep={currentStep} showDetails={this.showStepDetails} />
						) : null}
						{this.showFormState ? (
							<DebuggerFormState
								formState={formState}
								isSubmitting={submission ? isSubmissionBusy(submission.status) : false}
								invalidSteps={steps.filter(({ isInvalid }) => isInvalid).map(({ id }) => id)}
							/>
						) : null}
					</div>
					{isMultiStep && navigation ? (
						<DebuggerNav
							steps={steps}
							currentStep={currentStep}
							navigation={navigation}
							onPrevious={this.goPrevious}
							onNext={this.goNext}
							onGoTo={this.goToStep}
						/>
					) : null}
				</section>
			</div>
		);
	}
}

export function FormDebugger(props: FormDebuggerProps = {}) {
	return (
		<FormDebuggerElement
			defaultOpen={props.defaultOpen}
			showStepDetails={props.showStepDetails}
			showFormState={props.showFormState}
		/>
	);
}
