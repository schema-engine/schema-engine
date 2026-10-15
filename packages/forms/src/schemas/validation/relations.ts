import * as z from 'zod/mini';
import type { RelateRule, RelationAssert, ValidationRegistration } from './types.js';
import { isEmpty } from './empty.js';

/**
 * Relation operands are values from registered fields.
 * @remarks Their concrete types are selected by the engine's element registrations.
 */
const RelationValueSchema = z.any();

/**
 * Brings a referenced value onto the rule's comparison basis.
 *
 * @remarks
 * `auto` leaves values untouched, which is right when the fields share a control
 * type. `date` yields a timestamp, and an unparseable string yields `NaN`: every
 * comparison against `NaN` is false, so an ordering assertion fails rather than
 * passing by accident. `null` and `undefined` are left alone so the emptiness
 * checks below still see them.
 */
function coerce(value: unknown, as: RelateRule['as']): unknown {
	if (value === undefined || value === null) {
		return value;
	}

	switch (as) {
		case 'string':
			return String(value);
		case 'number':
			return Number(value);
		case 'date':
			return value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
		case 'boolean':
			return Boolean(value);
		default:
			return value;
	}
}

const ASSERTIONS: Record<RelationAssert, (values: readonly unknown[]) => boolean> = {
	allEqual: (values) => values.every((value) => Object.is(value, values[0])),
	allDifferent: (values) => new Set(values.map((value) => JSON.stringify(value))).size === values.length,
	ascending: (values) =>
		values.every((value, index) => index === 0 || (value as number) >= (values[index - 1] as number)),
	strictlyAscending: (values) =>
		values.every((value, index) => index === 0 || (value as number) > (values[index - 1] as number)),
	descending: (values) =>
		values.every((value, index) => index === 0 || (value as number) <= (values[index - 1] as number)),
	strictlyDescending: (values) =>
		values.every((value, index) => index === 0 || (value as number) < (values[index - 1] as number)),
	atLeastOne: (values) => values.some((value) => !isEmpty(value)),
	exactlyOne: (values) => values.filter((value) => !isEmpty(value)).length === 1,
	allOrNone: (values) => {
		const filled = values.filter((value) => !isEmpty(value)).length;
		return filled === 0 || filled === values.length;
	},
};

const DEFAULT_MESSAGES: Record<RelationAssert, string> = {
	allEqual: 'These fields must match',
	allDifferent: 'These fields must be different',
	ascending: 'Values must be in ascending order',
	strictlyAscending: 'Values must increase',
	descending: 'Values must be in descending order',
	strictlyDescending: 'Values must decrease',
	atLeastOne: 'Fill at least one of these fields',
	exactlyOne: 'Fill exactly one of these fields',
	allOrNone: 'Fill all of these fields or none',
};

/**
 * Assertions whose whole job is to fire on a partly filled group.
 *
 * @remarks
 * `skipWhenIncomplete` would make these no-ops, so it does not apply to them.
 */
const EMPTINESS_ASSERTIONS = new Set<RelationAssert>(['atLeastOne', 'exactlyOne', 'allOrNone']);

/**
 * One rule for every comparison between a field and its siblings.
 *
 * @remarks
 * Password confirmation, date ordering, "one of these two", and mutual exclusion
 * are the same operation with a different assertion, so they share one
 * registration rather than each getting a handler with its own emptiness and
 * reference-scoping semantics to keep in step. Authoring sugar belongs in
 * `relation-presets.ts`, which returns plain rule objects a CMS can round-trip.
 */
export const relateValidation: ValidationRegistration<RelateRule> = {
	type: 'relate',
	category: 'cross-field',
	dependsOn: (rule) => rule.fields,
	handler: (rule, context) =>
		RelationValueSchema.check(
			z.refine((value: unknown) => {
				const referenced = rule.fields.map((fieldRef) => context.resolve(fieldRef));
				const participating = rule.includeSelf ? [value, ...referenced] : referenced;

				if (rule.skipWhenIncomplete && !EMPTINESS_ASSERTIONS.has(rule.assert) && participating.some(isEmpty)) {
					return true;
				}

				return ASSERTIONS[rule.assert](participating.map((entry) => coerce(entry, rule.as)));
			}, rule.message ?? DEFAULT_MESSAGES[rule.assert]),
		),
};
