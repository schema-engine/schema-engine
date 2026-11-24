import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { actions, notices, type Notice } from './actions';
import { newsletter } from './config';

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, actions });

/** The form, and a status line that {@link showNotices} fills. */
export function Newsletter() {
	return (
		<>
			<FormRenderer engine={engine} config={newsletter} />
			<output data-notice />
		</>
	);
}

/** Shows what the notification actions announce in the status line under `root`, until the returned function runs. */
export function showNotices(root: ParentNode): () => void {
	const show = (event: Event) => {
		const status = root.querySelector('[data-notice]');
		if (status) status.textContent = (event as CustomEvent<Notice>).detail.message;
	};
	notices.addEventListener('notice', show);
	return () => notices.removeEventListener('notice', show);
}
