import type { NormalizedElementConfig } from '@schema-engine/forms';
import { foldFieldParticipation, resolveParticipation, type Participation } from '@schema-engine/forms/engine';

/** What a server render decides for one field: whether it shows, is disabled and is required. */
export interface RenderedConstraints {
	shouldShow: boolean;
	shouldDisable: boolean;
	isRequired: boolean;
}

/**
 * Reads what the form's constraints say about a field from the participation the server's container holds.
 *
 * @remarks
 * The same source as the client: the container's participation of the values the server rendered, with the
 * containers around the field folded in, so a field that a skipped step or a hidden field takes out is not in
 * the server markup, and hydration does not remove it.
 */
export function constraintsFromParticipation(
	participation: Pick<Participation, 'fields'>,
	fieldPath: string,
	baseRequired: boolean,
): RenderedConstraints {
	const { hidden, disabled, required } = foldFieldParticipation(participation.fields, fieldPath);
	return { shouldShow: !hidden, shouldDisable: disabled, isRequired: required || baseRequired };
}

/**
 * What the form's constraints say about an element rendered on its own, outside a form render that holds the steps.
 *
 * @remarks
 * The same function as everywhere else: the element is resolved by `resolveParticipation` as a one-step config over the
 * values available, then folded at its path. Only the element's own constraints are known here, since no container
 * around it is.
 */
export function standaloneConstraints(
	config: NormalizedElementConfig,
	fieldPath: string,
	values: Record<string, unknown>,
	baseRequired: boolean,
): RenderedConstraints {
	const participation = resolveParticipation(
		[{ id: 'standalone', elements: [{ ...config, name: fieldPath }] }],
		values,
	);
	return constraintsFromParticipation(participation, fieldPath, baseRequired);
}
