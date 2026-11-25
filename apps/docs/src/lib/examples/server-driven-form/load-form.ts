import { formatIssuePath, type FormEngineRuntime, type NormalizedFormConfig } from '@schema-engine/forms';

export type LoadedForm = { success: true; config: NormalizedFormConfig } | { success: false; issues: string[] };

/**
 * Fetches a form config and checks it against the engine that will render it.
 *
 * @remarks
 * `safeValidateForm` checks every element and rule against the registrations of the engine, so a config this
 * client cannot render is a list of issues with their paths, not an error thrown while rendering. A status that is
 * not a success is an issue too. A network failure or a body that is not JSON throws, as any `fetch` call does.
 */
export async function loadForm(engine: Pick<FormEngineRuntime, 'safeValidateForm'>, url: string): Promise<LoadedForm> {
	const response = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) return { success: false, issues: [`The server answered ${response.status}.`] };
	const result = engine.safeValidateForm(await response.json());
	if (result.success) return { success: true, config: result.data };
	return { success: false, issues: result.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`) };
}
