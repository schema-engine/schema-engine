import {
	ActionDispatcher,
	parseActions,
	type ActionDispatchResult,
	type ParsedActionSequence,
} from '@schema-engine/actions';
import { registry, type CheckoutContext, type CheckoutTrigger } from './actions';

export type Loaded = { success: true; actions: ParsedActionSequence } | { success: false; issues: string[] };

const where = (path: ReadonlyArray<PropertyKey | { key: PropertyKey }> = []) =>
	path.map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment))).join('.');

/**
 * Fetches a workflow and checks it against the registered actions.
 *
 * @remarks
 * The result is the parsed sequence, which is the only thing the dispatcher accepts, or the issues that explain
 * why the workflow cannot run: the server could not be reached, it answered with an error status or with text
 * that is not JSON, or an entry fails its schema, with the entry's path.
 */
export async function loadWorkflow(url: string, request: typeof fetch = fetch): Promise<Loaded> {
	let response: Response;
	try {
		response = await request(url, { headers: { Accept: 'application/json' } });
	} catch {
		return { success: false, issues: ['The server could not be reached.'] };
	}
	if (!response.ok) return { success: false, issues: [`The server answered ${response.status}.`] };
	let input: unknown;
	try {
		input = await response.json();
	} catch {
		return { success: false, issues: ['The answer is not JSON.'] };
	}
	const parsed = parseActions(registry, input);
	if (parsed.success) return { success: true, actions: parsed.data };
	return { success: false, issues: parsed.issues.map((issue) => `${where(issue.path)}: ${issue.message}`) };
}

/** Runs the entries of a parsed workflow that answer `trigger`. */
export function runWorkflow(
	actions: ParsedActionSequence,
	trigger: CheckoutTrigger,
	context: CheckoutContext,
): Promise<ActionDispatchResult[]> {
	return new ActionDispatcher(registry).dispatch({ actions, trigger, context });
}
