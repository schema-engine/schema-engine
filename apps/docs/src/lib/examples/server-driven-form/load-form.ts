import type { FormEngineRuntime, NormalizedFormConfig } from '@schema-engine/forms';

export type LoadedForm = { success: true; config: NormalizedFormConfig } | { success: false; issues: string[] };

const where = (path: ReadonlyArray<PropertyKey | { key: PropertyKey }> = []) =>
	path.map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment))).join('.');

/**
 * Fetches a form config and checks it against the engine that will render it.
 *
 * @remarks
 * `safeValidateForm` checks every element and rule against the registrations of the engine, so a config this
 * client cannot render is a list of issues with their paths, not an error thrown while rendering. A failed
 * request is an issue too.
 */
export async function loadForm(
	engine: Pick<FormEngineRuntime, 'safeValidateForm'>,
	url: string,
	request: typeof fetch = fetch,
): Promise<LoadedForm> {
	let response: Response;
	try {
		response = await request(url, { headers: { Accept: 'application/json' } });
	} catch {
		return { success: false, issues: ['The server could not be reached.'] };
	}
	if (!response.ok) return { success: false, issues: [`The server answered ${response.status}.`] };
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		return { success: false, issues: ['The answer is not JSON.'] };
	}
	const result = engine.safeValidateForm(body);
	if (result.success) return { success: true, config: result.data };
	return { success: false, issues: result.issues.map((issue) => `${where(issue.path)}: ${issue.message}`) };
}
