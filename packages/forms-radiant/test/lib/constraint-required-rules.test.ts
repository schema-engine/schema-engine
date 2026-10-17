import { describe, expect, test } from 'vitest';
import { applyConstraintRequired, replaceBaselineRules } from '@/lib/constraint-required-rules';

const validate = () => true;

describe('applyConstraintRequired', () => {
	test('sets and clears the constraint-required marker', () => {
		const field = document.createElement('se-field');
		field.setAttribute('data-se-validation-rules', JSON.stringify([]));

		expect(applyConstraintRequired(field, true)).toBe(true);
		expect(applyConstraintRequired(field, true)).toBe(false);
		expect(field.getAttribute('data-se-constraint-required')).toBe('');
		expect(Reflect.get(field, 'rules')).toMatchObject({ required: true });

		expect(applyConstraintRequired(field, false)).toBe(true);
		expect(applyConstraintRequired(field, false)).toBe(false);
		expect(field.hasAttribute('data-se-constraint-required')).toBe(false);
		expect(Reflect.get(field, 'rules')).toMatchObject({ required: undefined });
	});

	test('keeps authored validate functions and RegExp patterns when toggling required', () => {
		const field = document.createElement('se-field');
		const pattern = /^ok$/;
		Reflect.set(field, 'rules', { required: false, validate, pattern: { value: pattern, message: 'nope' } });

		applyConstraintRequired(field, true);
		const requiredRules = Reflect.get(field, 'rules') as {
			required: unknown;
			validate: unknown;
			pattern: { value: RegExp };
		};
		expect(requiredRules.required).toBe(true);
		expect(requiredRules.validate).toBe(validate);
		expect(requiredRules.pattern.value).toBe(pattern);

		applyConstraintRequired(field, false);
		const restored = Reflect.get(field, 'rules') as { required: unknown; validate: unknown };
		expect(restored.required).toBe(false);
		expect(restored.validate).toBe(validate);
	});

	test('marks the field before notifying the control', () => {
		const field = document.createElement('se-field') as HTMLElement & { onRulesUpdated?: () => void };
		let nestedResult: boolean | undefined;
		field.onRulesUpdated = () => {
			nestedResult = applyConstraintRequired(field, true);
		};

		expect(applyConstraintRequired(field, true)).toBe(true);
		expect(nestedResult).toBe(false);
	});

	test('keeps rules rebuilt after the first sync when required toggles again', () => {
		const field = document.createElement('se-field');
		field.setAttribute('data-se-validation-rules', JSON.stringify([]));
		applyConstraintRequired(field, true);

		replaceBaselineRules(field, { validate });
		expect(Reflect.get(field, 'rules')).toMatchObject({ required: true, validate });

		applyConstraintRequired(field, false);
		expect(Reflect.get(field, 'rules')).toMatchObject({ required: undefined, validate });
	});
});
