/** @jsxImportSource react */
import { useEffect, useState } from 'react';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { actions, notices, type Notice } from './actions';
import { newsletter } from './config';
import { elements } from './widgets.react';

export const engine = createFormEngine({ elements, actions });

/** The form, and a status line that shows what the notification actions announce. */
export function Newsletter() {
	const [message, setMessage] = useState('');
	useEffect(() => {
		const show = (event: Event) => setMessage((event as CustomEvent<Notice>).detail.message);
		notices.addEventListener('notice', show);
		return () => notices.removeEventListener('notice', show);
	}, []);

	return (
		<>
			<FormRenderer engine={engine} config={newsletter} />
			<output>{message}</output>
		</>
	);
}
