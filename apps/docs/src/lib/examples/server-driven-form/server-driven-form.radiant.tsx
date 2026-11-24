import { createRoot } from '@ecopages/jsx/client';
import { NotificationActionRegistration } from '@schema-engine/forms';
import { createRadiantFormEngine, FormRenderer, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { policy } from './csrf';
import { loadForm } from './load-form';
import { signUp } from './submit';

export const engine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	csrf: policy,
	actions: [NotificationActionRegistration],
});

/** Fetches the form from `url` and renders it into `host`, or lists why it cannot. `onSignedUp` runs once the account exists. */
export async function mountSignupForm(host: HTMLElement, url: string, onSignedUp: () => void): Promise<void> {
	const loaded = await loadForm(engine, url);
	createRoot(host).render(
		loaded.success ? (
			<FormRenderer
				engine={engine}
				config={loaded.config}
				onSubmit={async (values, helpers) => {
					if (await signUp(values, helpers)) onSignedUp();
				}}
			/>
		) : (
			<ul role="alert">
				{loaded.issues.map((issue) => (
					<li>{issue}</li>
				))}
			</ul>
		),
	);
}
