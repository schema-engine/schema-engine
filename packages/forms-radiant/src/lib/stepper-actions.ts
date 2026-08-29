export const STEPPER_ACTION_ATTR = 'data-se-stepper';
export const STEPPER_STEP_INDEX_ATTR = 'data-se-step-index';
export const STEPPER_ACTION_EVENT = 'se-stepper-action';

export type ResolvedStepperAction = { action: 'next' | 'previous' } | { action: 'goto'; stepIndex: number };

export type StepperActionTarget = {
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	goToStep: (index: number) => void;
};

function isDisabledControl(element: Element): boolean {
	const isDisabledButton =
		typeof HTMLButtonElement !== 'undefined' && element instanceof HTMLButtonElement && element.disabled;
	return isDisabledButton || element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
}

export function resolveStepperAction(event: Event): ResolvedStepperAction | null {
	for (const node of event.composedPath()) {
		if (!(node instanceof Element)) {
			continue;
		}

		const action = node.getAttribute(STEPPER_ACTION_ATTR);
		if (action !== 'next' && action !== 'previous' && action !== 'goto') {
			continue;
		}

		if (isDisabledControl(node)) {
			return null;
		}

		if (action === 'goto') {
			const stepIndex = Number(node.getAttribute(STEPPER_STEP_INDEX_ATTR));
			if (!Number.isInteger(stepIndex)) {
				return null;
			}
			return { action, stepIndex };
		}

		return { action };
	}

	return null;
}

export function isStepperActionTarget(value: unknown): value is StepperActionTarget {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as StepperActionTarget).goToNextStep === 'function' &&
		typeof (value as StepperActionTarget).goToPreviousStep === 'function' &&
		typeof (value as StepperActionTarget).goToStep === 'function'
	);
}

export function applyStepperAction(
	target: StepperActionTarget | undefined,
	action: ResolvedStepperAction | null,
): void {
	if (!target || !action) {
		return;
	}

	if (action.action === 'next') {
		target.goToNextStep();
		return;
	}

	if (action.action === 'previous') {
		target.goToPreviousStep();
		return;
	}

	if (action.action === 'goto') {
		target.goToStep(action.stepIndex);
	}
}

export function routeStepperClick(
	event: Event,
	formInstance: unknown,
	navigation: unknown,
	emit: (action: ResolvedStepperAction) => void,
): void {
	const action = resolveStepperAction(event);
	if (!action) {
		return;
	}

	event.stopPropagation();

	const target = isStepperActionTarget(formInstance)
		? formInstance
		: isStepperActionTarget(navigation)
			? navigation
			: undefined;

	if (target) {
		applyStepperAction(target, action);
		return;
	}

	emit(action);
}

export function dispatchStepperAction(host: EventTarget, action: ResolvedStepperAction): void {
	host.dispatchEvent(
		new CustomEvent(STEPPER_ACTION_EVENT, {
			bubbles: true,
			composed: true,
			detail: action,
		}),
	);
}
