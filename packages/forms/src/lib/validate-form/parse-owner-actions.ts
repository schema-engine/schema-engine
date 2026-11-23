import { parseActions, type ParsedActionSequence } from '@schema-engine/actions';
import type { FormTaggedConfig } from '@/schemas/form-config';
import type { FormValidationIssue, Path } from './issues';
import type { ValidateFormOptions } from './options';
import { fromSchemaIssues } from './schema-issues';

/**
 * Parses the `actions` of the form or of a step with {@link parseActions}, and lays the issues under `actions` at the owner.
 *
 * @remarks
 * A nested array is a group of actions that run together; its members sit one level deeper in the path.
 */
export function parseOwnerActions(
	items: Array<FormTaggedConfig | FormTaggedConfig[]> | undefined,
	options: Pick<ValidateFormOptions, 'getAction'>,
	ownerPath: Path,
): { issues: FormValidationIssue[]; items?: ParsedActionSequence } {
	if (!items) return { issues: [] };
	const result = parseActions(options, items);
	if (!result.success) return { issues: fromSchemaIssues(result.issues, [...ownerPath, 'actions']) };
	return { issues: [], items: result.data };
}
