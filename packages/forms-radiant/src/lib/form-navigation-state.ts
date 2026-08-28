let suppressNextSubmit = false;

export function markNextStepSubmit(): void {
	suppressNextSubmit = true;
}

export function consumeSubmitSuppression(): boolean {
	const shouldSuppress = suppressNextSubmit;
	suppressNextSubmit = false;
	return shouldSuppress;
}
