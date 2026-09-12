import { computed, state, type Signal } from '@ecopages/signals';
import type { FormConfigView } from '@schema-engine/forms';
import type { FormContextValue } from '../types';
import { collectFieldDefaults, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { getValueAtPath, mergePathValues, setValueAtPath } from '@schema-engine/forms/lib/path-values';
import { validateFormValues } from '@/lib/validation';

let fieldIdCounter = 0;

export function createFieldId(): string {
	fieldIdCounter += 1;
	return `field-${fieldIdCounter}`;
}

export class FormStore<TFormData extends Record<string, unknown> = Record<string, unknown>> {
	readonly values = state<Record<string, unknown>>({});
	readonly errors = state<Record<string, string>>({});
	readonly touched = state<Record<string, boolean>>({});
	readonly isSubmitting = state(false);
	readonly submitCount = state(0);
	readonly currentStep = state(0);

	private readonly stepElements: object[];
	private readonly defaultValues: Partial<TFormData>;

	constructor(
		private readonly config: FormConfigView,
		userDefaults: Partial<TFormData> = {},
	) {
		this.stepElements = flattenStepElements(config.steps);
		this.defaultValues = userDefaults;
		this.values.set(
			mergePathValues(
				collectFieldDefaults(this.stepElements, userDefaults as Record<string, unknown>),
				userDefaults as Record<string, unknown>,
			),
		);
	}

	watchValue<TValue = unknown>(name: string): Signal<TValue> {
		return computed(() => getValueAtPath<TValue>(this.values.get(), name)) as Signal<TValue>;
	}

	fieldValueSignal<TValue = unknown>(name: string): Signal<TValue> {
		return computed(() => getValueAtPath<TValue>(this.values.get(), name) ?? ('' as TValue));
	}

	fieldErrorSignal(name: string): Signal<string | undefined> {
		return computed(() => this.errors.get()[name]);
	}

	getValue<TValue = unknown>(name: string): TValue | undefined {
		return getValueAtPath<TValue>(this.values.get(), name);
	}

	setValue(name: string, value: unknown): void {
		const next = { ...this.values.get() };
		setValueAtPath(next, name, value);
		this.values.set(next);
	}

	getError(name: string): string | undefined {
		return this.errors.get()[name];
	}

	markTouched(name: string): void {
		this.touched.set({ ...this.touched.get(), [name]: true });
	}

	async trigger(names?: string | string[]): Promise<boolean> {
		const allErrors = await validateFormValues(this.stepElements, this.values.get());
		if (!names) {
			this.errors.set(allErrors);
			return Object.keys(allErrors).length === 0;
		}

		const targetNames = Array.isArray(names) ? names : [names];
		const nextErrors = { ...this.errors.get() };
		for (const name of targetNames) {
			if (allErrors[name]) {
				nextErrors[name] = allErrors[name];
			} else {
				delete nextErrors[name];
			}
		}
		this.errors.set(nextErrors);
		return !targetNames.some((name) => allErrors[name]);
	}

	setFocus(name: string): void {
		const element = document.querySelector<HTMLElement>(`[name="${name}"]`);
		element?.focus();
	}

	getValues(): TFormData {
		return this.values.get() as TFormData;
	}

	getContext(): FormContextValue<TFormData> {
		const errors = this.errors.get();
		const formErrors = Object.fromEntries(Object.entries(errors).map(([key, message]) => [key, { message }]));

		return {
			getValues: () => this.getValues(),
			setValue: (name, value) => this.setValue(name, value),
			trigger: (name) => this.trigger(name),
			setFocus: (name) => this.setFocus(name),
			formState: {
				errors: formErrors,
				isValid: Object.keys(errors).length === 0,
				isSubmitting: this.isSubmitting.get(),
				touchedFields: this.touched.get(),
				submitCount: this.submitCount.get(),
				defaultValues: this.defaultValues,
			},
		};
	}

	async validateAll(): Promise<boolean> {
		const errors = await validateFormValues(this.stepElements, this.values.get());
		this.errors.set(errors);
		return Object.keys(errors).length === 0;
	}

	beginSubmit(): void {
		this.isSubmitting.set(true);
		this.submitCount.set(this.submitCount.get() + 1);
	}

	endSubmit(): void {
		this.isSubmitting.set(false);
	}
}
