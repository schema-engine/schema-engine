import { parseActions, type ParsedActionSequence } from '@schema-engine/actions';
import { FormActionTriggerSchema } from '../../actions/triggers.js';
import type { FormValidationIssue, Path } from './issues.js';
import type { ValidateFormOptions } from './options.js';
import { fromSchemaIssues } from './schema-issues.js';

/**
 * Parses the `actions` of the form or of a step with {@link parseActions}, and lays the issues under `actions` at the owner.
 *
 * @remarks
 * A nested array is a group of actions that run together; its members sit one level deeper in the path. The items
 * arrive as authored: `parseActions` reports an entry that is not an object or has no registered `$type` as that
 * entry's issue.
 */
export function parseOwnerActions(
	items: readonly unknown[] | undefined,
	options: Pick<ValidateFormOptions, 'actions'>,
	ownerPath: Path,
): { issues: FormValidationIssue[]; items?: ParsedActionSequence } {
	if (!items) return { issues: [] };
	const result = parseActions(options.actions, items, { triggers: FormActionTriggerSchema.options });
	if (!result.success) return { issues: fromSchemaIssues(result.issues, [...ownerPath, 'actions']) };
	return { issues: [], items: result.data };
}
