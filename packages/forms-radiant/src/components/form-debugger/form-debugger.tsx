import './form-debugger.css';
import { customElement, onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { RuiBadge } from '@ecopages/radiant-ui/badge';
import { RuiButton } from '@ecopages/radiant-ui/button';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { findNearestRuiForm } from '@/lib/rui-form-utils';

type RuiFormStore = {
	getState: () => {
		values: Record<string, unknown>;
		errors: Record<string, unknown>;
		isSubmitting: boolean;
		isValid: boolean;
	};
	subscribe: (listener: () => void) => () => void;
};

function findFormInstance(host: Node): HTMLElement | null {
	let current: Node | null = host;
	while (current) {
		if (current instanceof HTMLElement && current.localName === 'se-form-instance') {
			return current;
		}
		current = current instanceof ShadowRoot ? current.host : current.parentNode;
	}
	return null;
}

function findFormConfig(host: Node): FormConfig | undefined {
	let current: Node | null = host;
	while (current) {
		if (current instanceof HTMLElement && current.localName === 'se-form-renderer') {
			return Reflect.get(current, 'config') as FormConfig | undefined;
		}
		if (current instanceof HTMLElement && current.localName === 'se-form-instance') {
			return Reflect.get(current, 'config') as FormConfig | undefined;
		}
		current = current instanceof ShadowRoot ? current.host : current.parentNode;
	}
	return undefined;
}

export interface FormDebuggerProps {
	defaultOpen?: boolean;
	showStepDetails?: boolean;
	showFormState?: boolean;
}

/** Opt-in floating inspector for values, errors, and multi-step progress. */
@customElement('se-form-debugger')
export class FormDebuggerElement extends RadiantElement {
	@prop({ type: Boolean, defaultValue: false }) defaultOpen = false;
	@prop({ type: Boolean, defaultValue: true }) showStepDetails = true;
	@prop({ type: Boolean, defaultValue: true }) showFormState = true;
	@prop({ type: Object }) config?: FormConfig;

	@state open = false;
	@state revision = 0;

	protected override onConnected(): void {
		this.open = this.defaultOpen;
		const form = findNearestRuiForm(this);
		const store = form ? (Reflect.get(form, 'store') as RuiFormStore | undefined) : undefined;
		if (store && typeof store.subscribe === 'function') {
			this.registerCleanupCallback(
				store.subscribe(() => {
					this.revision += 1;
				}),
			);
		}
	}

	@onEvent({ type: 'click', selector: '[data-se-debugger-action]' })
	onAction(event: Event): void {
		const action = (event.target as HTMLElement).closest<HTMLElement>('[data-se-debugger-action]')?.dataset
			.seDebuggerAction;
		if (action === 'open') this.open = true;
		if (action === 'close') this.open = false;
		const instance = findFormInstance(this);
		if (!instance) return;
		if (action === 'previous') (Reflect.get(instance, 'goToPreviousStep') as (() => void) | undefined)?.();
		if (action === 'next') void (Reflect.get(instance, 'goToNextStep') as (() => Promise<void>) | undefined)?.();
		if (action?.startsWith('step:')) {
			(Reflect.get(instance, 'goToStep') as ((index: number) => void) | undefined)?.(Number(action.slice(5)));
		}
	}

	override render() {
		if (!this.open) {
			return (
				<div class="se-form-debugger se-form-debugger--collapsed">
					<RuiButton
						type="button"
						variant="filled"
						size="lg"
						square
						class="se-form-debugger__toggle"
						data-se-debugger-action="open"
						aria-label="Open form debugger"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m8 6 4-4 4 4" />
							<path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
							<path d="m20 22-5-5" />
						</svg>
					</RuiButton>
				</div>
			);
		}

		const form = findNearestRuiForm(this);
		const store = form ? (Reflect.get(form, 'store') as RuiFormStore | undefined) : undefined;
		const formState = store?.getState();
		const instance = findFormInstance(this);
		const currentStep = Number(Reflect.get(instance ?? {}, 'currentStep') ?? 0);
		const stepStates = Reflect.get(instance ?? {}, 'stepStates') as
			{ completed?: boolean[]; valid?: boolean[]; visited?: boolean[] } | undefined;
		const config = this.config ?? findFormConfig(this);
		const steps = config?.steps ?? [];
		const isMultiStep = steps.length > 1;
		const progress = isMultiStep ? ((currentStep + 1) / steps.length) * 100 : 100;

		return (
			<div class="se-form-debugger se-form-debugger--expanded">
				<section class="se-form-debugger__panel" aria-label="Form debugger">
					<header class="se-form-debugger__header">
						<div>
							<h3 class="se-form-debugger__title">{config?.title ?? 'Form Debugger'}</h3>
							{isMultiStep ? (
								<span class="se-form-debugger__subtitle">
									Step {currentStep + 1} / {steps.length}
								</span>
							) : null}
						</div>
						<RuiButton
							type="button"
							variant="ghost"
							size="sm"
							square
							class="se-form-debugger__close-button"
							data-se-debugger-action="close"
							aria-label="Close debugger"
						>
							<svg
								viewBox="0 0 24 24"
								aria-hidden="true"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</RuiButton>
					</header>
					<div class="se-form-debugger__content">
						{isMultiStep ? (
							<section>
								<p class="se-form-debugger__section-title">Progress</p>
								<progress class="se-form-debugger__progress" max={100} value={progress} />
							</section>
						) : null}
						{isMultiStep ? (
							<section>
								<p class="se-form-debugger__section-title">Steps</p>
								<div class="se-form-debugger__timeline">
									{steps.map((step, index) => (
										<div
											class="se-form-debugger__timeline-item"
											data-active={String(index === currentStep)}
										>
											<div>
												<div class="se-form-debugger__step-title">
													{step.title ?? `Step ${index + 1}`}
												</div>
												{this.showStepDetails && step.description ? (
													<div class="se-form-debugger__step-description">
														{step.description}
													</div>
												) : null}
												<div class="se-form-debugger__timeline-meta">
													{stepStates?.valid?.[index] ? (
														<RuiBadge
															variant="filled"
															class="se-form-debugger__badge se-form-debugger__badge--valid"
														>
															Valid
														</RuiBadge>
													) : null}
													{!stepStates?.valid?.[index] && stepStates?.visited?.[index] ? (
														<RuiBadge
															variant="filled"
															class="se-form-debugger__badge se-form-debugger__badge--invalid"
														>
															Invalid
														</RuiBadge>
													) : null}
													{stepStates?.visited?.[index] ? (
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
						) : null}
						{this.showFormState ? (
							<section>
								<p class="se-form-debugger__section-title">Form state</p>
								<div class="se-form-debugger__details">
									<div class="se-form-debugger__row">
										<span class="se-form-debugger__detail-label">Submitting</span>
										<code class="se-form-debugger__detail-value">
											{String(formState?.isSubmitting ?? false)}
										</code>
									</div>
									<div class="se-form-debugger__row">
										<span class="se-form-debugger__detail-label">Valid</span>
										<code class="se-form-debugger__detail-value">
											{String(formState?.isValid ?? true)}
										</code>
									</div>
									{stepStates ? (
										<div class="se-form-debugger__row">
											<span class="se-form-debugger__detail-label">Step states</span>
											<code class="se-form-debugger__detail-value">
												{JSON.stringify(stepStates.valid)}
											</code>
										</div>
									) : null}
								</div>
								<pre class="se-form-debugger__pre">
									{JSON.stringify(formState?.values ?? {}, null, 2)}
								</pre>
								{Object.keys(formState?.errors ?? {}).length ? (
									<pre class="se-form-debugger__pre">
										{JSON.stringify(formState?.errors, null, 2)}
									</pre>
								) : null}
							</section>
						) : null}
					</div>
					{isMultiStep ? (
						<footer class="se-form-debugger__nav">
							<RuiButton
								type="button"
								variant="outline"
								size="sm"
								data-se-debugger-action="previous"
								disabled={currentStep === 0}
							>
								Previous
							</RuiButton>
							<div class="se-form-debugger__nav-dots">
								{steps.map((step, index) => (
									<button
										type="button"
										class="se-form-debugger__nav-dot"
										data-active={String(index === currentStep)}
										data-completed={String(index < currentStep)}
										data-se-debugger-action={`step:${index}`}
										disabled={!stepStates?.visited?.[index] && index > currentStep}
										aria-label={`Go to ${step.title ?? `step ${index + 1}`}`}
									/>
								))}
							</div>
							<RuiButton
								type="button"
								variant="outline"
								size="sm"
								data-se-debugger-action="next"
								disabled={currentStep >= steps.length - 1}
							>
								Next
							</RuiButton>
						</footer>
					) : null}
				</section>
			</div>
		);
	}
}

export function FormDebugger(props: FormDebuggerProps & { config?: FormConfig } = {}) {
	return jsx('se-form-debugger', {
		'prop:defaultOpen': props.defaultOpen,
		'prop:showStepDetails': props.showStepDetails,
		'prop:showFormState': props.showFormState,
		'prop:config': props.config,
	});
}
