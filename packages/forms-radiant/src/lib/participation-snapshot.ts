import { foldFieldParticipation, type Participation } from '@schema-engine/forms/engine';

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
