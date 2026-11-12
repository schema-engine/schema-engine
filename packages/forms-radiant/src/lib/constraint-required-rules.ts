import type { FieldRules } from '@ecopages/radiant-ui/form';
import { readHydratedRules, type FieldRulesHost } from '@/components/internals/field-rule-hydrator';

const REQUIRED_MARKER = '[data-se-required-marker]';

const baselineRules = new WeakMap<HTMLElement, FieldRules>();

function snapshotBaseline(field: FieldRulesHost): FieldRules {
	const cached = baselineRules.get(field);
	if (cached) {
		return cached;
	}

	const liveRules = field.rules;
	const hydrated = readHydratedRules(field);
	const base = hydrated ?? liveRules ?? {};
	baselineRules.set(field, base);
	return base;
}

/**
 * Applies constraint-driven required state while preserving authored rules for lift.
 *
 * @remarks
 * The WeakMap holds the original `FieldRules` object so `validate` functions and
 * `RegExp` patterns survive toggling. A JSON clone would strip both.
 */
export function applyConstraintRequired(field: FieldRulesHost, isRequired: boolean): boolean {
	const base = snapshotBaseline(field);
	const current = field.rules;
	const required = isRequired ? (typeof base.required === 'string' ? base.required : true) : base.required;
	if (current?.required === required && field.hasAttribute('data-se-constraint-required') === isRequired) {
		return false;
	}
	const next: FieldRules = {
		...base,
		required,
	};
	field.rules = next;
	field.toggleAttribute('data-se-constraint-required', isRequired);
	field.querySelector(REQUIRED_MARKER)?.toggleAttribute('hidden', !required);
	field.onRulesUpdated?.();
	return true;
}
