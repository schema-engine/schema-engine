import * as z from 'zod/mini';
import { parseActions } from '../src/parse-actions';
import type { ActionConfigBase, ParsedActionSequence } from '../src/types';

const acceptAnything = { getAction: () => ({ schema: z.unknown() }) };

/**
 * Parses actions with a registry that accepts any `$type` and any shape, for the tests that exercise
 * dispatch and not the checking.
 */
export function parsed<TConfig extends ActionConfigBase = ActionConfigBase>(
	actions: readonly unknown[],
): ParsedActionSequence<TConfig> {
	const result = parseActions<TConfig>(acceptAnything, actions);
	if (!result.success) throw new Error(result.issues.map((issue) => issue.message).join(', '));
	return result.data;
}
