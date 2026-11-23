import type { Participation, FormEngineRuntime as FormEngine } from '@schema-engine/forms';

/**
 * Engine that owns the field currently being rendered.
 *
 * @remarks
 * {@link renderRegisteredElement} is the only writer. Field hosts read it so
 * initial SSR, standalone {@link FormElement} renders, and later array updates
 * share one ownership path: the engine passed into that render. Dynamic hosts
 * such as `se-form-array` retain the same engine on the element and pass it
 * back into {@link FormElements} on subsequent updates.
 *
 * Correct only while element rendering is synchronous: the value is restored
 * when {@link renderWithOwningFormEngine} returns, so an element that awaited
 * mid-render would read whichever engine happens to be current by then.
 */
let owningEngine: FormEngine | undefined;

export function renderWithOwningFormEngine<T>(engine: FormEngine, render: () => T): T {
	const previous = owningEngine;
	owningEngine = engine;
	try {
		return render();
	} finally {
		owningEngine = previous;
	}
}

/** Engine currently being rendered inside {@link renderWithOwningFormEngine}. */
export function peekOwningFormEngine(): FormEngine | undefined {
	return owningEngine;
}

/** @remarks Synchronous container renders inherit the owning form's SSR snapshot. */
let owningValues: Record<string, unknown> | undefined;

export function peekOwningConstraintValues(): Record<string, unknown> | undefined {
	return owningValues;
}

export function renderWithConstraintValues<T>(values: Record<string, unknown> | undefined, render: () => T): T {
	const previous = owningValues;
	owningValues = values ?? previous;
	try {
		return render();
	} finally {
		owningValues = previous;
	}
}

/** @remarks Synchronous container renders inherit the server container's row ids, so a nested array renders the rows the client's container will hold. */
let owningRowIds: Readonly<Record<string, readonly string[]>> | undefined;

export function peekOwningRowIds(): Readonly<Record<string, readonly string[]>> | undefined {
	return owningRowIds;
}

export function renderWithRowIds<T>(
	rowIds: Readonly<Record<string, readonly string[]>> | undefined,
	render: () => T,
): T {
	const previous = owningRowIds;
	owningRowIds = rowIds ?? previous;
	try {
		return render();
	} finally {
		owningRowIds = previous;
	}
}

/** @remarks Synchronous container renders inherit the participation of the values the server rendered, so a nested field is shown, disabled and required as the client's container will say. */
let owningParticipation: Pick<Participation, 'fields'> | undefined;

export function peekOwningParticipation(): Pick<Participation, 'fields'> | undefined {
	return owningParticipation;
}

export function renderWithParticipation<T>(
	participation: Pick<Participation, 'fields'> | undefined,
	render: () => T,
): T {
	const previous = owningParticipation;
	owningParticipation = participation ?? previous;
	try {
		return render();
	} finally {
		owningParticipation = previous;
	}
}
