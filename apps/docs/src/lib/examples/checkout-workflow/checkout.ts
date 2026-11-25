import { ActionDispatcher, parseActions, type ActionDispatchResult } from '@schema-engine/actions';
import { formatIssuePath } from '@schema-engine/registry';
import { registry, type CheckoutContext } from './actions';

export type Checkout = { success: true; results: ActionDispatchResult[] } | { success: false; issues: string[] };

/**
 * Parses a workflow and runs it on `submit`.
 *
 * @remarks
 * `parseActions` checks every entry against the schema of its action, and the dispatcher accepts only what it
 * returned. A workflow with a bad entry runs nothing, not even its valid entries.
 */
export async function runCheckout(text: string, context: CheckoutContext): Promise<Checkout> {
	let input: unknown;
	try {
		input = JSON.parse(text);
	} catch {
		return { success: false, issues: ['The workflow is not valid JSON.'] };
	}
	const parsed = parseActions(registry, input);
	if (!parsed.success) {
		return {
			success: false,
			issues: parsed.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`),
		};
	}
	const results = await new ActionDispatcher(registry).dispatch({ actions: parsed.data, trigger: 'submit', context });
	return { success: true, results };
}
