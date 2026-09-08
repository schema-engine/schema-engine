export function fieldNamesForStep(step: { elements?: ReadonlyArray<{ name?: string }> } | undefined): string[] {
	return (step?.elements ?? []).map((field) => field.name).filter((name): name is string => Boolean(name));
}

type StepValidationStore = {
	isSubmitted: boolean;
	validateField: (name: string) => Promise<boolean>;
	markTouched: (name: string) => void;
};

export async function validateCurrentStepFields(store: StepValidationStore, fieldNames: string[]): Promise<boolean> {
	if (fieldNames.length === 0) {
		return true;
	}

	const results = await Promise.all(fieldNames.map((name) => store.validateField(name)));
	const isValid = results.every(Boolean);
	if (isValid) {
		return true;
	}

	store.isSubmitted = true;
	for (const name of fieldNames) {
		store.markTouched(name);
	}
	return false;
}
