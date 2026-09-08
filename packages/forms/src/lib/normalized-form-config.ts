import type { FormConfig } from '@/schemas/form-config';

const VALIDATED_FORM_CONFIG = Symbol.for('@schema-engine/forms.validated-form-config');

/**
 * Form configuration that has already passed engine validation (defaults and transforms applied).
 * Render paths must not re-run registration input schemas against this object.
 */
export type ValidatedFormConfig = FormConfig & {
	readonly [VALIDATED_FORM_CONFIG]: true;
};

export function isValidatedFormConfig(value: unknown): value is ValidatedFormConfig {
	return typeof value === 'object' && value !== null && VALIDATED_FORM_CONFIG in value;
}

export function markValidatedFormConfig(config: FormConfig): ValidatedFormConfig {
	if (isValidatedFormConfig(config)) {
		return config;
	}

	return Object.defineProperty(config, VALIDATED_FORM_CONFIG, {
		value: true,
		enumerable: false,
		configurable: false,
	}) as ValidatedFormConfig;
}
