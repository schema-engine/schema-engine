import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import { getActiveFormEngine } from '@/registries/active-engine';

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

/** Engine of the in-progress field render, else the active engine. */
export function owningFormEngine(): FormEngine | undefined {
	return owningEngine ?? getActiveFormEngine();
}
