/** @jsxImportSource react */
import { useEffect, useState } from 'react';
import { createFormEngine, NotificationActionRegistration } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { policy } from './csrf';
import { loadForm, type LoadedForm } from './load-form';
import { signUp } from './submit';
import { elements } from './widgets.react';

export const engine = createFormEngine({ elements, csrf: policy, actions: [NotificationActionRegistration] });

/** Fetches the form from `url`, then renders it, or lists why it cannot. `onSignedUp` runs once the account exists. */
export function SignupForm({ url, onSignedUp }: { url: string; onSignedUp: () => void }) {
	const [loaded, setLoaded] = useState<LoadedForm>();
	useEffect(() => {
		void loadForm(engine, url).then(setLoaded);
	}, [url]);

	if (!loaded) return <p>Loading the form</p>;
	if (!loaded.success) {
		return (
			<ul role="alert">
				{loaded.issues.map((issue) => (
					<li key={issue}>{issue}</li>
				))}
			</ul>
		);
	}
	return (
		<FormRenderer
			engine={engine}
			config={loaded.config}
			onSubmit={async (values, helpers) => {
				if (await signUp(values, helpers)) onSignedUp();
			}}
		/>
	);
}
