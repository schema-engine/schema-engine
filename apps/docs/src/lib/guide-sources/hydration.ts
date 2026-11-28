import { createFormStateContainer, toHydration } from '@schema-engine/forms/state-container';
import { engine } from './engine';

const config = engine.defineForm({
	id: 'profile',
	steps: [{ id: 'main', title: 'Profile', elements: [{ $type: 'input', id: 'name', name: 'name' }] }],
});
const registry = engine.validations;
const defaults = { name: 'Ada' };

/** On the server: render the form from its container, and send the part a client needs next to the markup. */
export function renderOnServer() {
	const server = createFormStateContainer({ config, registry, defaults });
	return JSON.stringify(toHydration(server.getServerSnapshot()));
}

/** In the browser: start from what the server rendered, with the same defaults. */
export function hydrateOnClient(payload: string) {
	return createFormStateContainer({ config, registry, defaults, snapshot: JSON.parse(payload) });
}
